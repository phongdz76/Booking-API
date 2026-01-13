import express from "express";
import { google } from "googleapis";
import dotenv from "dotenv";
import { ConfidentialClientApplication } from "@azure/msal-node";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

// Validate environment variables
if (
  !process.env.GOOGLE_CLIENT_ID ||
  !process.env.GOOGLE_CLIENT_SECRET ||
  !process.env.GOOGLE_REDIRECT_URL
) {
  throw new Error("Missing required environment variables");
}

const googleAuthClient = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URL
);

const calendar = google.calendar({
  version: "v3",
  auth: googleAuthClient,
});

// Validation helper
const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isValidDateTime = (dateTime: string): boolean => {
  const date = new Date(dateTime);
  return !isNaN(date.getTime());
};

// Routes
app.get("/", (req, res) => {
  res.send("Welcome to the Google Calendar and Microsoft integration service.");
});

app.get("/google/auth", (req, res) => {
  try {
    const url = googleAuthClient.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/calendar.events"],
    });
    res.redirect(url);
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).json({ error: "Failed to generate auth URL" });
  }
});

app.get("/google/callback", async (req, res) => {
  try {
    const code = req.query.code as string;

    if (!code || typeof code !== "string") {
      return res
        .status(400)
        .json({ error: "Missing or invalid authorization code" });
    }

    const authCredentials = await googleAuthClient.getToken(code);

    if (!authCredentials || !authCredentials.tokens) {
      return res
        .status(400)
        .json({ error: "Invalid authentication credentials" });
    }
    const tokens = authCredentials.tokens;

    googleAuthClient.setCredentials(tokens);
    res.json({ message: "Successfully authenticated with Google Calendar" });
  } catch (error) {
    console.error("Callback error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
});

app.post("/google/create-event", async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      startTime,
      endTime,
      participants,
      needMeetLink,
    } = req.body;

    // Validate required fields
    if (!title || !description || !location || !startTime || !endTime) {
      return res.status(400).json({
        error:
          "Missing required fields: title, description, location, startTime, endTime",
      });
    }

    // Validate datetime format
    if (!isValidDateTime(startTime) || !isValidDateTime(endTime)) {
      return res
        .status(400)
        .json({ error: "Invalid datetime format for startTime or endTime" });
    }

    // Validate time logic
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      return res.status(400).json({ error: "endTime must be after startTime" });
    }

    if (start < new Date()) {
      return res.status(400).json({ error: "startTime cannot be in the past" });
    }

    // Validate participants if provided
    if (participants !== undefined) {
      if (!Array.isArray(participants)) {
        return res.status(400).json({ error: "participants must be an array" });
      }

      for (const email of participants) {
        if (typeof email !== "string" || !isValidEmail(email)) {
          return res
            .status(400)
            .json({ error: `Invalid email format: ${email}` });
        }
      }
    }

    // Validate needMeetLink
    if (needMeetLink !== undefined && typeof needMeetLink !== "boolean") {
      return res.status(400).json({ error: "needMeetLink must be a boolean" });
    }

    // Prepare attendees list
    const attendees = participants
      ? participants.map((email: string) => ({ email }))
      : [];

    // Configure conferencing if needed
    const conferenceData = needMeetLink
      ? {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        }
      : undefined;

    const event = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: needMeetLink ? 1 : 0,
      requestBody: {
        summary: title,
        description: description || "",
        location: location || "",
        start: {
          dateTime: startTime,
          timeZone: "Asia/Ho_Chi_Minh",
        },
        end: {
          dateTime: endTime,
          timeZone: "Asia/Ho_Chi_Minh",
        },
        attendees: attendees.length > 0 ? attendees : undefined,
        conferenceData: conferenceData,
      },
    });

    res.status(201).json({
      message: "Event created successfully",
      eventId: event.data.id,
      eventLink: event.data.htmlLink,
      meetLink: event.data.hangoutLink || null,
    });
  } catch (error) {
    console.error("Create event error:", error);

    if ((error as any).code === 401) {
      return res.status(401).json({
        error: "Not authenticated. Please authenticate first at /google/auth",
      });
    }

    res.status(500).json({ error: "Failed to create event" });
  }
});

// Microsoft Authentication Client Setup

if (
  !process.env.MICROSOFT_CLIENT_ID ||
  !process.env.MICROSOFT_CLIENT_SECRET ||
  !process.env.MICROSOFT_REDIRECT_URL
) {
  throw new Error("Missing required Microsoft environment variables");
}

const microsoftAuthClient = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    authority: "https://login.microsoftonline.com/common",
  },
});

app.get("/microsoft/auth", async (req, res) => {
  try {
    const redirectUri = process.env.MICROSOFT_REDIRECT_URL;

    if (!redirectUri) {
      return res
        .status(500)
        .json({ error: "Microsoft redirect URL not configured" });
    }

    const url = await microsoftAuthClient.getAuthCodeUrl({
      scopes: ["Calendars.ReadWrite"],
      redirectUri: redirectUri,
    });

    res.redirect(url);
  } catch (error) {
    console.error("Microsoft Auth error:", error);
    res.status(500).json({ error: "Failed to generate Microsoft auth URL" });
  }
});

app.get("/microsoft/callback", async (req, res) => {
  try {
    const code = req.query.code as string;
    const redirectUri = process.env.MICROSOFT_REDIRECT_URL;

    // Validate authorization code
    if (!code || typeof code !== "string") {
      return res
        .status(400)
        .json({ error: "Missing or invalid authorization code" });
    }

    if (!redirectUri) {
      return res
        .status(500)
        .json({ error: "Microsoft redirect URL not configured" });
    }

    // Acquire token
    const result = await microsoftAuthClient.acquireTokenByCode({
      code: code,
      scopes: ["Calendars.ReadWrite"],
      redirectUri: redirectUri,
    });

    // Validate result
    if (!result || !result.accessToken) {
      return res
        .status(400)
        .json({ error: "Invalid authentication credentials" });
    }

    res.json({
      message: "Successfully authenticated with Microsoft",
      accessToken: result.accessToken,
      expiresOn: result.expiresOn,
    });
  } catch (error) {
    console.error("Microsoft Callback error:", error);
    res.status(500).json({ error: "Microsoft authentication failed" });
  }
});

app.post("/microsoft/create-event", async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      startTime,
      endTime,
      participants,
      needMeetLink,
      accessToken,
    } = req.body;

    // Validate access token
    if (!accessToken || typeof accessToken !== "string") {
      return res.status(401).json({
        error:
          "Missing access token. Please authenticate first at /microsoft/auth",
      });
    }

    // Validate required fields
    if (!title || !description || !location || !startTime || !endTime) {
      return res.status(400).json({
        error:
          "Missing required fields: title, description, location, startTime, endTime",
      });
    }

    // Validate datetime format
    if (!isValidDateTime(startTime) || !isValidDateTime(endTime)) {
      return res
        .status(400)
        .json({ error: "Invalid datetime format for startTime or endTime" });
    }

    // Validate time logic
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      return res.status(400).json({ error: "endTime must be after startTime" });
    }

    if (start < new Date()) {
      return res.status(400).json({ error: "startTime cannot be in the past" });
    }

    // Validate participants if provided
    if (participants !== undefined) {
      if (!Array.isArray(participants)) {
        return res.status(400).json({ error: "participants must be an array" });
      }

      for (const email of participants) {
        if (typeof email !== "string" || !isValidEmail(email)) {
          return res
            .status(400)
            .json({ error: `Invalid email format: ${email}` });
        }
      }
    }

    // Validate needMeetLink
    if (needMeetLink !== undefined && typeof needMeetLink !== "boolean") {
      return res.status(400).json({ error: "needMeetLink must be a boolean" });
    }

    // Prepare attendees list
    const attendees = participants
      ? participants.map((email: string) => ({
          emailAddress: { address: email },
          type: "required",
        }))
      : [];

    // Prepare event body for Microsoft Graph API
    const eventBody: any = {
      subject: title,
      body: {
        contentType: "HTML",
        content: description || "",
      },
      location: {
        displayName: location || "",
      },
      start: {
        dateTime: startTime,
        timeZone: "Asia/Bangkok",
      },
      end: {
        dateTime: endTime,
        timeZone: "Asia/Bangkok",
      },
      attendees: attendees.length > 0 ? attendees : undefined,
    };

    // Add online meeting if needed
    if (needMeetLink) {
      eventBody.isOnlineMeeting = true;
      eventBody.onlineMeetingProvider = "teamsForBusiness";
    }

    // Call Microsoft Graph API to create event
    const response = await fetch("https://graph.microsoft.com/v1.0/me/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as any;
      console.error("Microsoft Graph API error:", errorData);

      if (response.status === 401) {
        return res.status(401).json({
          error:
            "Authentication expired. Please authenticate again at /microsoft/auth",
        });
      }

      return res.status(response.status).json({
        error: errorData.error?.message || "Failed to create event",
      });
    }

    const event = (await response.json()) as any;

    res.status(201).json({
      message: "Event created successfully",
      eventId: event.id,
      eventLink: event.webLink,
      meetLink: event.onlineMeeting?.joinUrl || null,
    });
  } catch (error) {
    console.error("Microsoft Create event error:", error);
    res.status(500).json({ error: "Failed to create Microsoft event" });
  }
});

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal server error" });
  }
);

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

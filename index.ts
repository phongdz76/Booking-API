import express from "express";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

// Validate environment variables
if (
  !process.env.CLIENT_ID ||
  !process.env.CLIENT_SECRET ||
  !process.env.REDIRECT_URL
) {
  throw new Error("Missing required environment variables");
}

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URL
);

const calendar = google.calendar({
  version: "v3",
  auth: oauth2Client,
});

// Routes
app.get("/", (req, res) => {
  res.send("Welcome to the Google Calendar");
});

app.get("/auth", (req, res) => {
  try {
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/calendar.events"],
    });
    res.redirect(url);
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).json({ error: "Failed to generate auth URL" });
  }
});

app.get("/callback", async (req, res) => {
  try {
    const code = req.query.code as string;

    if (!code) {
      return res.status(400).json({ error: "Authorization code is required" });
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    res.json({ message: "Successfully authenticated with Google Calendar" });
  } catch (error) {
    console.error("Callback error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
});

app.post("/create-event", async (req, res) => {
  try {
    const { title, description, location, startTime, endTime } = req.body;

    // Validate required fields
    if (!title || !location || !startTime || !endTime) {
      return res.status(400).json({
        error: "Missing required fields: title, location, startTime, endTime",
      });
    }

    const event = await calendar.events.insert({
      calendarId: "primary",
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
      },
    });

    res.status(201).json({
      message: "Event created successfully",
      eventId: event.data.id,
      eventLink: event.data.htmlLink,
    });
  } catch (error) {
    console.error("Create event error:", error);
    res.status(500).json({ error: "Failed to create event" });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

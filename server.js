require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.URL, process.env.KEY);

let latestLocations = {}; // cache { ambulance_uuid: { ambulance_location, site_location } }

setInterval(async () => {
  const { data, error } = await supabase
    .from("report")
    .select("ambulance_uuid, ambulance_location, site_location");

  if (error) {
    console.error("Supabase polling error:", error);
    return;
  }

  if (data) {
    data.forEach((report) => {
      const { ambulance_uuid, ambulance_location, site_location } = report;

      if (
        ambulance_location &&
        ambulance_location.latitude &&
        ambulance_location.longitude
      ) {
        latestLocations[ambulance_uuid] = {
          ambulance_location: {
            latitude: ambulance_location.latitude,
            longitude: ambulance_location.longitude,
          },
        };
      }

      if (site_location && site_location.latitude && site_location.longitude) {
        latestLocations[ambulance_uuid] = {
          ...latestLocations[ambulance_uuid],
          site_location: {
            latitude: site_location.latitude,
            longitude: site_location.longitude,
          },
        };
      }
    });
  }
}, 1000); // poll every 1 second

app.post("/location", (req, res) => {
  const { ambulance_uuid } = req.body;

  if (!ambulance_uuid) {
    return res.status(400).json({ error: "ambulance_uuid is required" });
  }

  const location = latestLocations[ambulance_uuid];

  if (!location) {
    return res
      .status(404)
      .json({ error: "Location not found for this ambulance_uuid" });
  }

  res.json({
    ambulance_uuid,
    ...location,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚑 Server running on port ${PORT}`);
});


const bcrypt = require("bcrypt");
const pool = require("../src/config/db");

const getLocalDate = () => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const seedDatabase = async () => {
  try {
    const name = process.env.SEED_NAME || "Demo User";
    const email = process.env.SEED_EMAIL?.trim().toLowerCase();
    const password = process.env.SEED_PASSWORD;

    if (!email || !password) {
      throw new Error(
        "SEED_EMAIL and SEED_PASSWORD must be configured"
      );
    }

    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      throw new Error("Seed password must be between 8 and 72 bytes");
    }

    // Reuse an existing user instead of resetting their password.
    let userResult = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    let userId;

    if (userResult.rows.length > 0) {
      userId = userResult.rows[0].id;
      console.log("Existing seed user found.");
    } else {
      const passwordHash = await bcrypt.hash(password, 12);

      userResult = await pool.query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [name, email, passwordHash]
      );

      userId = userResult.rows[0].id;
      console.log("Demo user created.");
    }

    const today = getLocalDate();

    const sampleReadings = [
      { time_slot: "Morning", value: 110 },
      { time_slot: "After breakfast", value: 145 },
      { time_slot: "After lunch", value: 135 }
    ];

    for (const reading of sampleReadings) {
      await pool.query(
        `INSERT INTO glucose_readings
          (user_id, reading_date, time_slot, value)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, reading_date, time_slot)
         DO NOTHING`,
        [userId, today, reading.time_slot, reading.value]
      );
    }

    console.log("Database seeding completed.");
    console.log(`Demo account: ${email}`);
    console.log(`Sample readings date: ${today}`);
  } catch (error) {
    console.error("Database seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

seedDatabase();

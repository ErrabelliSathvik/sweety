const request = require("supertest");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "sweety-test-secret";

jest.mock("../src/config/db", () => ({
  query: jest.fn()
}));

const pool = require("../src/config/db");
const app = require("../src/app");

const token = jwt.sign(
  { userId: 1 },
  process.env.JWT_SECRET,
  { expiresIn: "1h" }
);

const authHeader = {
  Authorization: `Bearer ${token}`
};

const sampleReading = {
  id: 10,
  reading_date: "2026-11-05",
  time_slot: "Morning",
  value: 150
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Sweety API", () => {

  // HEALTH CHECK
  test("GET /api/health returns API status", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  // AUTHENTICATION
  test("protected reading route rejects missing token", async () => {
    const response = await request(app).get("/api/readings");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test("protected reading route rejects an invalid JWT", async () => {
    const response = await request(app)
      .get("/api/readings")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  // CREATE READING
  test("POST /api/readings creates a valid reading", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [sampleReading]
    });

    const response = await request(app)
      .post("/api/readings")
      .set(authHeader)
      .send(sampleReading);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.reading.value).toBe(150);

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO glucose_readings"),
      [1, "2026-11-05", "Morning", 150]
    );
  });

  test("POST /api/readings rejects glucose below 40", async () => {
    const response = await request(app)
      .post("/api/readings")
      .set(authHeader)
      .send({
        reading_date: "2026-11-05",
        time_slot: "Morning",
        value: 39
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("POST /api/readings rejects duplicate date and time slot", async () => {
    pool.query.mockRejectedValueOnce({ code: "23505" });

    const response = await request(app)
      .post("/api/readings")
      .set(authHeader)
      .send(sampleReading);

    expect(response.status).toBe(409);
    expect(response.body.message).toBe(
      "A reading already exists for this date and time slot"
    );
  });

  test("POST /api/readings rejects future dates", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const futureDate = [
      tomorrow.getFullYear(),
      String(tomorrow.getMonth() + 1).padStart(2, "0"),
      String(tomorrow.getDate()).padStart(2, "0")
    ].join("-");

    const response = await request(app)
      .post("/api/readings")
      .set(authHeader)
      .send({
        ...sampleReading,
        reading_date: futureDate
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Future reading dates are not allowed"
    );

    expect(pool.query).not.toHaveBeenCalled();
  });

  // GET READINGS
  test("GET /api/readings returns only the authenticated user's readings", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [sampleReading] });

    const response = await request(app)
      .get("/api/readings")
      .set(authHeader);

    expect(response.status).toBe(200);
    expect(response.body.pagination.total).toBe(1);
    expect(response.body.readings).toHaveLength(1);

    expect(pool.query.mock.calls[0][1]).toEqual([1]);
    expect(pool.query.mock.calls[1][1]).toEqual([1, 20, 0]);
  });

  test("GET /api/readings/:id returns 404 when the reading is not owned by the user", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .get("/api/readings/99")
      .set(authHeader);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Reading not found");

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE id = $1 AND user_id = $2"),
      [99, 1]
    );
  });

  // UPDATE READING
  test("PUT /api/readings/:id updates an owned reading", async () => {
    const updatedReading = {
      ...sampleReading,
      value: 180
    };

    pool.query.mockResolvedValueOnce({
      rows: [updatedReading]
    });

    const response = await request(app)
      .put("/api/readings/10")
      .set(authHeader)
      .send(updatedReading);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.reading.value).toBe(180);

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE id = $4 AND user_id = $5"),
      ["2026-11-05", "Morning", 180, 10, 1]
    );
  });

  test("PUT /api/readings/:id returns 404 for another user's reading", async () => {
    pool.query.mockResolvedValueOnce({
      rows: []
    });

    const response = await request(app)
      .put("/api/readings/99")
      .set(authHeader)
      .send(sampleReading);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Reading not found");
  });

  // DELETE READING
  test("DELETE /api/readings/:id deletes an owned reading", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 10 }]
    });

    const response = await request(app)
      .delete("/api/readings/10")
      .set(authHeader);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE id = $1 AND user_id = $2"),
      [10, 1]
    );
  });

  // DAILY REPORT
  test("GET /api/reports/daily rejects an invalid date", async () => {
    const response = await request(app)
      .get("/api/reports/daily?date=2026-02-30")
      .set(authHeader);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("GET /api/reports/daily returns correct summary and readings", async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{ is_future: false }]
      })
      .mockResolvedValueOnce({
        rows: [{
          count: 1,
          highest: 150,
          lowest: 150,
          average: 150
        }]
      })
      .mockResolvedValueOnce({
        rows: [sampleReading]
      });

    const response = await request(app)
      .get("/api/reports/daily?date=2026-11-05")
      .set(authHeader);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.period).toBe("daily");
    expect(response.body.summary.count).toBe(1);
    expect(response.body.summary.highest).toBe(150);
    expect(response.body.summary.lowest).toBe(150);
    expect(response.body.summary.average).toBe(150);
    expect(response.body.readings).toHaveLength(1);
  });

  // MONTH-TO-DATE REPORT
  test("GET /api/reports/month-to-date returns monthly summary", async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{
          start_date: "2026-11-01",
          end_date: "2026-11-16"
        }]
      })
      .mockResolvedValueOnce({
        rows: [{
          count: 2,
          highest: 180,
          lowest: 120,
          average: 150
        }]
      })
      .mockResolvedValueOnce({
        rows: [
          sampleReading,
          { ...sampleReading, id: 11, value: 180 }
        ]
      });

    const response = await request(app)
      .get("/api/reports/month-to-date")
      .set(authHeader);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.period).toBe("month-to-date");
    expect(response.body.summary.count).toBe(2);
    expect(response.body.summary.highest).toBe(180);
    expect(response.body.summary.lowest).toBe(120);
    expect(response.body.summary.average).toBe(150);
    expect(response.body.readings).toHaveLength(2);
  });

  // PREVIOUS MONTH REPORT
  test("GET /api/reports/previous-month returns previous month summary", async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{
          start_date: "2026-10-01",
          end_date: "2026-11-01"
        }]
      })
      .mockResolvedValueOnce({
        rows: [{
          count: 0,
          highest: null,
          lowest: null,
          average: null
        }]
      })
      .mockResolvedValueOnce({
        rows: []
      });

    const response = await request(app)
      .get("/api/reports/previous-month")
      .set(authHeader);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.period).toBe("previous-month");
    expect(response.body.summary.count).toBe(0);
    expect(response.body.summary.highest).toBeNull();
    expect(response.body.summary.lowest).toBeNull();
    expect(response.body.summary.average).toBeNull();
    expect(response.body.readings).toHaveLength(0);
  });

});

const pool = require("../config/db");

// Validate YYYY-MM-DD dates, including invalid calendar dates.
const isValidDate = (date) => {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
};

// Fetch report summary and readings for a date range.
// endDate is exclusive.
const getReportData = async (userId, startDate, endDate) => {
  const summaryResult = await pool.query(
    `SELECT
       COUNT(*)::INTEGER AS count,
       MAX(value)::INTEGER AS highest,
       MIN(value)::INTEGER AS lowest,
       ROUND(AVG(value)::NUMERIC, 1)::FLOAT AS average
     FROM glucose_readings
     WHERE user_id = $1
       AND reading_date >= $2::DATE
       AND reading_date < $3::DATE`,
    [userId, startDate, endDate]
  );

  const readingsResult = await pool.query(
    `SELECT
       id,
       reading_date::TEXT AS reading_date,
       time_slot,
       value,
       created_at,
       updated_at
     FROM glucose_readings
     WHERE user_id = $1
       AND reading_date >= $2::DATE
       AND reading_date < $3::DATE
     ORDER BY
       reading_date DESC,
       CASE time_slot
         WHEN 'Morning' THEN 1
         WHEN 'After breakfast' THEN 2
         WHEN 'After lunch' THEN 3
         WHEN 'After dinner' THEN 4
       END`,
    [userId, startDate, endDate]
  );

  return {
    summary: summaryResult.rows[0],
    readings: readingsResult.rows
  };
};

// DAILY REPORT
const getDailyReport = async (req, res) => {
  try {
    let date = req.query.date;

    // Default to today's date.
    if (date === undefined) {
      const todayResult = await pool.query(
        "SELECT CURRENT_DATE::TEXT AS today"
      );

      date = todayResult.rows[0].today;
    }

    if (!isValidDate(date)) {
      return res.status(400).json({
        success: false,
        message: "Date must be valid and use YYYY-MM-DD format"
      });
    }

    // Reject future dates.
    const dateCheck = await pool.query(
      "SELECT $1::DATE > CURRENT_DATE AS is_future",
      [date]
    );

    if (dateCheck.rows[0].is_future) {
      return res.status(400).json({
        success: false,
        message: "Future dates are not allowed"
      });
    }

    // Calculate the exclusive end date.
    const endDate = new Date(`${date}T00:00:00.000Z`);
    endDate.setUTCDate(endDate.getUTCDate() + 1);

    const result = await getReportData(
      req.user.id,
      date,
      endDate.toISOString().slice(0, 10)
    );

    return res.status(200).json({
      success: true,
      period: "daily",
      date,
      ...result
    });
  } catch (error) {
    console.error("Daily report error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// MONTH-TO-DATE REPORT
const getMonthToDateReport = async (req, res) => {
  try {
    const datesResult = await pool.query(
      `SELECT
         DATE_TRUNC('month', CURRENT_DATE)::DATE::TEXT AS start_date,
         (CURRENT_DATE + 1)::DATE::TEXT AS end_date`
    );

    const { start_date, end_date } = datesResult.rows[0];

    const result = await getReportData(
      req.user.id,
      start_date,
      end_date
    );

    return res.status(200).json({
      success: true,
      period: "month-to-date",
      start_date,
      end_date,
      ...result
    });
  } catch (error) {
    console.error("Month-to-date report error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// PREVIOUS CALENDAR MONTH REPORT
const getPreviousMonthReport = async (req, res) => {
  try {
    const datesResult = await pool.query(
      `SELECT
         (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month')::DATE::TEXT
           AS start_date,
         DATE_TRUNC('month', CURRENT_DATE)::DATE::TEXT
           AS end_date`
    );

    const { start_date, end_date } = datesResult.rows[0];

    const result = await getReportData(
      req.user.id,
      start_date,
      end_date
    );

    return res.status(200).json({
      success: true,
      period: "previous-month",
      start_date,
      end_date,
      ...result
    });
  } catch (error) {
    console.error("Previous month report error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

module.exports = {
  getDailyReport,
  getMonthToDateReport,
  getPreviousMonthReport
};

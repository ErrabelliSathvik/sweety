
import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:5000/api";

const TIME_SLOTS = [
  "Morning",
  "After breakfast",
  "After lunch",
  "After dinner",
];

function getLocalDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPreviousMonthEndLabel() {
  const date = new Date();
  date.setDate(0);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function Dashboard({ onLogout }) {
  const [readings, setReadings] = useState([]);
  const [summary, setSummary] = useState(null);

  const [readingDate, setReadingDate] = useState(getLocalDate());
  const [timeSlot, setTimeSlot] = useState("Morning");
  const [value, setValue] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [reportType, setReportType] = useState("daily");
  const [reportDate, setReportDate] = useState(getLocalDate());
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const getHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("sweety_token")}`,
  });

  const loadDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const [readingsResponse, reportResponse] = await Promise.all([
        fetch(`${API_URL}/readings`, { headers: getHeaders() }),
        fetch(`${API_URL}/reports/daily`, { headers: getHeaders() }),
      ]);

      const readingsData = await readingsResponse.json();
      const reportData = await reportResponse.json();

      if (!readingsResponse.ok) {
        throw new Error(readingsData.message || "Unable to load readings.");
      }

      if (!reportResponse.ok) {
        throw new Error(reportData.message || "Unable to load daily summary.");
      }

      setReadings(readingsData.readings || []);
      setSummary(reportData.summary);
    } catch (err) {
      setError(err.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async () => {
    setReportLoading(true);
    setReportError("");

    try {
      let endpoint = `${API_URL}/reports/daily?date=${encodeURIComponent(reportDate)}`;

      if (reportType === "month-to-date") {
        endpoint = `${API_URL}/reports/month-to-date`;
      } else if (reportType === "previous-month") {
        endpoint = `${API_URL}/reports/previous-month`;
      }

      const response = await fetch(endpoint, {
        headers: getHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load report.");
      }

      setReportData(data);
    } catch (err) {
      setReportData(null);
      setReportError(err.message || "Unable to load report.");
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    loadReport();
  }, [reportType, reportDate]);

  const handleSaveReading = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const numericValue = Number(value);

    if (
      !Number.isInteger(numericValue) ||
      numericValue < 40 ||
      numericValue > 600
    ) {
      setError("Glucose value must be an integer between 40 and 600.");
      return;
    }

    if (!readingDate || readingDate > getLocalDate()) {
      setError("A valid date no later than today is required.");
      return;
    }

    setSaving(true);

    try {
      const isEditing = editingId !== null;

      const response = await fetch(
        isEditing
          ? `${API_URL}/readings/${editingId}`
          : `${API_URL}/readings`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            reading_date: readingDate,
            time_slot: timeSlot,
            value: numericValue,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to save reading.");
      }

      setValue("");
      setEditingId(null);

      setMessage(
        isEditing
          ? "Reading updated successfully."
          : "Glucose reading saved successfully."
      );

      await Promise.all([loadDashboard(), loadReport()]);
    } catch (err) {
      setError(err.message || "Unable to save reading.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (reading) => {
    setEditingId(reading.id);
    setReadingDate(String(reading.reading_date).slice(0, 10));
    setTimeSlot(reading.time_slot);
    setValue(String(reading.value));
    setError("");
    setMessage("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setReadingDate(getLocalDate());
    setTimeSlot("Morning");
    setValue("");
    setError("");
    setMessage("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this reading?")) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/readings/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete reading.");
      }

      if (editingId === id) {
        handleCancelEdit();
      }

      setMessage("Reading deleted successfully.");

      await Promise.all([loadDashboard(), loadReport()]);
    } catch (err) {
      setError(err.message || "Unable to delete reading.");
    }
  };

  return (
    <main className="dashboard-container">
      <header className="dashboard-header">
        <div className="brand">
          <span className="brand-icon">♥</span>
          <h1>Sweety</h1>
        </div>

        <button className="logout-button" onClick={onLogout}>
          Log out
        </button>
      </header>

      <section className="dashboard-content">
        <h2>Glucose Dashboard</h2>
        <p>Track and manage your daily blood glucose readings.</p>

        {error && <div className="alert error">{error}</div>}
        {message && <div className="alert success">{message}</div>}

        <section className="summary-grid">
          <article className="summary-card">
            <span>Today's readings</span>
            <strong>{summary?.count ?? 0}</strong>
          </article>

          <article className="summary-card">
            <span>Highest</span>
            <strong>{summary?.highest ?? "--"}</strong>
            <small>mg/dL</small>
          </article>

          <article className="summary-card">
            <span>Lowest</span>
            <strong>{summary?.lowest ?? "--"}</strong>
            <small>mg/dL</small>
          </article>

          <article className="summary-card">
            <span>Average</span>
            <strong>{summary?.average ?? "--"}</strong>
            <small>mg/dL</small>
          </article>
        </section>

        <section className="dashboard-panel">
          <h3>
            {editingId !== null ? "Edit glucose reading" : "Add glucose reading"}
          </h3>

          <form onSubmit={handleSaveReading} className="reading-form">
            <div className="form-group">
              <label htmlFor="reading-date">Reading date</label>
              <input
                id="reading-date"
                type="date"
                value={readingDate}
                max={getLocalDate()}
                onChange={(e) => setReadingDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="time-slot">Time slot</label>
              <select
                id="time-slot"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="glucose-value">Glucose value (mg/dL)</label>
              <input
                id="glucose-value"
                type="number"
                min="40"
                max="600"
                step="1"
                placeholder="e.g. 120"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="primary-button" disabled={saving}>
              {saving
                ? "Please wait..."
                : editingId !== null
                  ? "Update reading"
                  : "Add reading"}
            </button>

            {editingId !== null && (
              <button
                type="button"
                className="logout-button"
                onClick={handleCancelEdit}
              >
                Cancel editing
              </button>
            )}
          </form>
        </section>

        <section className="dashboard-panel">
          <h3>Glucose Reports</h3>

          <div className="report-tabs">
            <button
              className={reportType === "daily" ? "primary-button" : "logout-button"}
              onClick={() => setReportType("daily")}
            >
              Daily
            </button>

            <button
              className={reportType === "month-to-date" ? "primary-button" : "logout-button"}
              onClick={() => setReportType("month-to-date")}
            >
              This Month
            </button>

            <button
              className={reportType === "previous-month" ? "primary-button" : "logout-button"}
              onClick={() => setReportType("previous-month")}
            >
              Previous Month
            </button>
          </div>

          {reportType === "daily" && (
            <div className="form-group report-date">
              <label htmlFor="report-date">Select report date</label>
              <input
                id="report-date"
                type="date"
                value={reportDate}
                max={getLocalDate()}
                onChange={(e) => setReportDate(e.target.value)}
              />
            </div>
          )}

          {reportLoading ? (
            <p>Loading report...</p>
          ) : reportError ? (
            <div className="alert error">{reportError}</div>
          ) : reportData ? (
            <>
              <p>
                {reportData.period === "daily"
                  ? `Report for ${reportData.date}`
                  : `Report period: ${reportData.start_date} to ${
                      reportData.period === "month-to-date"
                        ? getLocalDate()
                        : getPreviousMonthEndLabel()
                    }`}
              </p>

              <div className="summary-grid">
                <article className="summary-card">
                  <span>Total readings</span>
                  <strong>{reportData.summary?.count ?? 0}</strong>
                </article>

                <article className="summary-card">
                  <span>Highest</span>
                  <strong>{reportData.summary?.highest ?? "--"}</strong>
                  <small>mg/dL</small>
                </article>

                <article className="summary-card">
                  <span>Lowest</span>
                  <strong>{reportData.summary?.lowest ?? "--"}</strong>
                  <small>mg/dL</small>
                </article>

                <article className="summary-card">
                  <span>Average</span>
                  <strong>{reportData.summary?.average ?? "--"}</strong>
                  <small>mg/dL</small>
                </article>
              </div>

              <h4>Readings in this report</h4>

              {reportData.readings?.length === 0 ? (
                <p>No readings found for this period.</p>
              ) : (
                <div className="table-wrapper">
                  <table className="readings-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Time slot</th>
                        <th>Glucose (mg/dL)</th>
                      </tr>
                    </thead>

                    <tbody>
                      {reportData.readings.map((reading) => (
                        <tr key={reading.id}>
                          <td>{reading.reading_date}</td>
                          <td>{reading.time_slot}</td>
                          <td>{reading.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : null}
        </section>

        <section className="dashboard-panel">
          <h3>Recent glucose readings</h3>

          {loading ? (
            <p>Loading readings...</p>
          ) : readings.length === 0 ? (
            <p>No glucose readings found. Add your first reading above.</p>
          ) : (
            <div className="table-wrapper">
              <table className="readings-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time slot</th>
                    <th>Glucose (mg/dL)</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {readings.map((reading) => (
                    <tr key={reading.id}>
                      <td>{String(reading.reading_date).slice(0, 10)}</td>
                      <td>{reading.time_slot}</td>
                      <td>{reading.value}</td>
                      <td>
                        <button
                          className="primary-button"
                          onClick={() => handleEdit(reading)}
                        >
                          Edit
                        </button>

                        <button
                          className="delete-button"
                          onClick={() => handleDelete(reading.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export default Dashboard;

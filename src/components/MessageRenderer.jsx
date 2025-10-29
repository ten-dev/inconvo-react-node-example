import { BarChart, LineChart } from "react-chartkick";
import "chartkick/chart.js";

/**
 * @typedef {import('@inconvoai/node/resources/conversations/response').ResponseCreateResponse} ResponseCreateResponse
 * @typedef {import('@inconvoai/node/resources/conversations/response').Chart} InconvoChart
 */

const TableRenderer = ({ response }) => (
  <table>
    <caption>{response.message}</caption>
    <thead>
      <tr>
        {response.table.head.map((h, i) => (
          <th key={i}>{h}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {response.table.body.map((row, i) => (
        <tr key={i}>
          {row.map((cell, j) => (
            <td key={j}>{cell}</td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

/**
 * @param {{ response: ResponseCreateResponse }} props
 */
const ChartRenderer = ({ response }) => {
  const chart = /** @type {InconvoChart | undefined} */ (response.chart);
  const labels = Array.isArray(chart?.data?.labels) ? chart.data.labels : [];
  const datasets = Array.isArray(chart?.data?.datasets) ? chart.data.datasets : [];

  if (!chart || !datasets.length || !labels.length) {
    return <div>No chart data</div>;
  }

  const chartData =
    datasets.length === 1
      ? labels.map((label, index) => [
          label,
          typeof datasets[0].values[index] === "number" ? datasets[0].values[index] : 0,
        ])
      : datasets.map((dataset) => ({
          name: dataset.name,
          data: labels.reduce((acc, label, index) => {
            const value = dataset.values[index];
            if (typeof value === "number") {
              acc[label] = value;
            }
            return acc;
          }, /** @type {Record<string, number>} */ ({})),
        }));

  const chartProps = {
    data: chartData,
    round: 2,
    thousands: ",",
    width: "400px",
    ...(chart.xLabel ? { xtitle: chart.xLabel } : {}),
    ...(chart.yLabel ? { ytitle: chart.yLabel } : {}),
  };

  return (
    <div className="chart-container">
      {response.message && <div>{response.message}</div>}
      {chart.title && chart.title !== response.message && <div>{chart.title}</div>}
      {chart.type === "bar" && <BarChart {...chartProps} />}
      {chart.type === "line" && <LineChart {...chartProps} />}
      {!["bar", "line"].includes(chart.type) && (
        <div>Unsupported chart type</div>
      )}
    </div>
  );
};

/**
 * @param {{ response: Partial<ResponseCreateResponse> }} props
 */
const MessageRenderer = ({ response }) => {
  if (!response || Object.keys(response).length === 0) {
    return <div>Send a message to see a response here</div>;
  }

  switch (response.type) {
    case "text":
      return <div>{response.message}</div>;
    case "table":
      return <TableRenderer response={response} />;
    case "chart":
      return <ChartRenderer response={response} />;
    default:
      return <div>Unsupported response type</div>;
  }
};

export default MessageRenderer;

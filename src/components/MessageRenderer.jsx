import { BarChart, LineChart } from "react-chartkick";
import "chartkick/chart.js";

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

const ChartRenderer = ({ response }) => {
  const data = response.chart.data.map((item) => [item.label, item.value]);
  
  const chartProps = {
    data,
    round: 2,
    thousands: ",",
    width: "400px"
  };

  return (
    <div className="chart-container">
      <div>{response.message}</div>
      {response.chart.type === "bar" && <BarChart {...chartProps} />}
      {response.chart.type === "line" && <LineChart {...chartProps} />}
      {!["bar", "line"].includes(response.chart.type) && (
        <div>Unsupported chart type</div>
      )}
    </div>
  );
};

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

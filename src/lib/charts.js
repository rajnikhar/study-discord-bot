function stockChart(labels, data, title) {
  const config = {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: title,
        data,
        fill: true,
        borderColor: '#5865F2',
        backgroundColor: 'rgba(88,101,242,0.15)',
        tension: 0.4,
        pointRadius: 4,
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        title: { display: true, text: title }
      },
      scales: { y: { beginAtZero: true } }
    }
  };
  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(config))}&w=600&h=300`;
}

function heatmap(data, title) {
  const labels = data.map(d => d.date);
  const values = data.map(d => d.value);
  const config = {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: title,
        data: values,
        backgroundColor: values.map(v =>
          v === 0   ? '#2d2d2d' :
          v < 30    ? '#0e4429' :
          v < 60    ? '#006d32' :
          v < 90    ? '#26a641' : '#39d353'
        )
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        title: { display: true, text: title }
      },
      scales: { y: { beginAtZero: true } }
    }
  };
  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(config))}&w=700&h=200`;
}

module.exports = { stockChart, heatmap };
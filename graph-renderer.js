document.addEventListener('DOMContentLoaded', () => {
    const ctx = document.getElementById('historyChart').getContext('2d');
    const exportGraphCsvBtn = document.getElementById('export-graph-csv-btn');
    let chartInstance;
    let plottedTags = [];
    let currentGraphData = [];

    const chartColors = ['#009999', '#e53e3e', '#48bb78', '#f6ad55', '#7b68ee', '#3182ce'];
    const datasetColorMap = {};
    const getDatasetColor = (tagName) => {
        if (!datasetColorMap[tagName]) {
            datasetColorMap[tagName] = chartColors[Object.keys(datasetColorMap).length % chartColors.length];
        }
        return datasetColorMap[tagName];
    };

    const initializeChart = () => {
        chartInstance = new Chart(ctx, {
            type: 'line', data: { datasets: [] },
            options: {
                responsive: true, maintainAspectRatio: false, animation: false,
                scales: {
                    x: { type: 'time', time: { unit: 'second' } },
                    y: { title: { display: true, text: 'Value' } }
                }
            }
        });
    };

    const updateGraph = async () => {
        if (plottedTags.length === 0) {
            chartInstance.data.datasets = [];
            chartInstance.update();
            currentGraphData = [];
            return;
        }

        const historyData = await window.graphApi.getHistory(plottedTags, 600); // Look back 10 mins
        const newDatasets = [];
        const exportData = [];

        plottedTags.forEach(tagName => {
            const tagHistory = (historyData[tagName] || []).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            newDatasets.push({
                label: tagName,
                data: tagHistory.map(r => ({ x: new Date(r.timestamp), y: Number(r.value) || 0 })),
                borderColor: getDatasetColor(tagName),
                tension: 0.1,
            });
            tagHistory.forEach(r => exportData.push({ tagName: r.tagName, value: r.value, timestamp: r.timestamp, dataType: r.dataType, quality: r.quality }));
        });
        chartInstance.data.datasets = newDatasets;
        chartInstance.update();
        currentGraphData = exportData;
    };

    const toggleTagPlot = (tagName) => {
        plottedTags.includes(tagName) ? plottedTags = plottedTags.filter(t => t !== tagName) : plottedTags.push(tagName);
        updateGraph();
        window.graphApi.sendPlottedTagsState(plottedTags);
    };

    exportGraphCsvBtn.addEventListener('click', async () => {
        await window.graphApi.exportData('graph', currentGraphData, 'csv');
    });

    window.graphApi.onUpdatePlottedTags(({ tagName }) => toggleTagPlot(tagName));

    initializeChart();
    updateGraph();
    setInterval(updateGraph, 2000);
});
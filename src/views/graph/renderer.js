import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';

Chart.register(...registerables);

document.addEventListener('DOMContentLoaded', () => {
    const ctx = document.getElementById('historyChart').getContext('2d');
    const legendContainer = document.getElementById('chart-legend');
    const exportBtn = document.getElementById('export-graph-csv-btn');
    const timeRangeSelect = document.getElementById('time-range-select');

    let chartInstance;
    let plottedTags = [];
    let penVisibility = {}; // Stores the visibility state of each pen
    const chartColors = ['#009999', '#e53e3e', '#48bb78', '#f6ad55', '#7b68ee', '#3182ce', '#f56565', '#4299e1', '#ed8936'];
    const colorMap = new Map();

    const getTagColor = (tagName) => {
        if (!colorMap.has(tagName)) {
            colorMap.set(tagName, chartColors[colorMap.size % chartColors.length]);
        }
        return colorMap.get(tagName);
    };

    const initializeChart = () => {
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: { datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { type: 'time', time: { unit: 'second', tooltipFormat: 'PPpp' } },
                    'y-analog': { // Primary axis for numbers
                        type: 'linear',
                        position: 'left',
                        title: { display: true, text: 'Value' }
                    },
                    'y-bool': { // Secondary axis for booleans
                        type: 'linear',
                        position: 'right',
                        min: -0.1,
                        max: 1.1,
                        grid: { drawOnChartArea: false }, // only show the axis line
                        ticks: {
                            stepSize: 1,
                            callback: function(value, index, values) {
                                return value === 1 ? 'TRUE' : (value === 0 ? 'FALSE' : '');
                            }
                        }
                    }
                }
            }
        });
    };

    const renderLegend = () => {
        legendContainer.innerHTML = '';
        plottedTags.forEach((tagName, index) => {
            const isHidden = penVisibility[tagName] === false; // Explicitly check for false
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `
                <input type="checkbox" id="legend-checkbox-${index}" ${isHidden ? '' : 'checked'}>
                <div class="legend-color-box" style="background-color: ${getTagColor(tagName)}"></div>
                <label for="legend-checkbox-${index}">${tagName}</label>
            `;
            legendContainer.appendChild(legendItem);

            legendItem.querySelector('input').addEventListener('change', (e) => {
                penVisibility[tagName] = e.target.checked;
                updateGraph(); // Redraw the graph with the new visibility
            });
        });
    };

    const updateGraph = async () => {
        const now = Date.now();
        const minutes = parseInt(timeRangeSelect.value);
        const past = now - minutes * 60 * 1000;
        chartInstance.options.scales.x.min = past;
        chartInstance.options.scales.x.max = now;
        
        if (plottedTags.length === 0) {
            chartInstance.data.datasets = [];
            chartInstance.data.labels = [];
            chartInstance.update();
            renderLegend();
            return;
        }

        const limit = minutes * 60;
        const historyData = await window.graphApi.getHistory(plottedTags, limit);
        
        const newDatasets = plottedTags.map(tagName => {
            const tagHistory = (historyData[tagName] || []);
            const isBool = tagHistory[0]?.dataType.toLowerCase().includes('bool');

            return {
                label: tagName,
                data: tagHistory.map(r => ({ x: new Date(r.timestamp), y: Number(r.value) || 0 })),
                borderColor: getTagColor(tagName),
                tension: 0.1,
                hidden: penVisibility[tagName] === false,
                yAxisID: isBool ? 'y-bool' : 'y-analog' // Assign to the correct axis
            };
        });

        chartInstance.data.datasets = newDatasets;
        chartInstance.update();
        renderLegend();
    };
    
    exportBtn.addEventListener('click', async () => {
        const visibleTags = plottedTags.filter(tag => penVisibility[tag] !== false);
        if (visibleTags.length === 0) {
            alert('No visible data to export.');
            return;
        }

        const limit = parseInt(timeRangeSelect.value) * 60;
        const historyData = await window.graphApi.getHistory(visibleTags, limit);

        let exportData = [];
        Object.values(historyData).forEach(records => {
            records.forEach(rec => {
                exportData.push({ tagName: rec.tagName, value: rec.value, timestamp: rec.timestamp });
            });
        });
        
        exportData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        await window.graphApi.exportData(exportData);
    });

    timeRangeSelect.addEventListener('change', updateGraph);
    window.graphApi.onPlottedTagsChanged(async (data) => {
        plottedTags = data.plottedTags;
        plottedTags.forEach(tag => {
            if (penVisibility[tag] === undefined) penVisibility[tag] = true;
        });
        await updateGraph();
    });

    const initialLoad = async () => {
        plottedTags = await window.graphApi.getPlottedTags();
        plottedTags.forEach(tag => penVisibility[tag] = true); // Default all to visible
        initializeChart();
        await updateGraph();
        setInterval(updateGraph, 1000);
    };

    initialLoad();
});
import { ChartJSNodeCanvas  } from 'chartjs-node-canvas';;
import config from '../config/botConfig.js';;

class ChartBuilder {
    constructor() {
        this.chartJSNodeCanvas = new ChartJSNodeCanvas({
            width: config.stats.defaultGraphDimensions.width,
            height: config.stats.defaultGraphDimensions.height,
            backgroundColour: config.stats.graphColors.background,
            plugins: {
                modern: ['chartjs-plugin-datalabels']
            }
        });
    }

    async createMemberGraph(data, days) {
        const options = {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Membros',
                        data: data.members,
                        borderColor: config.stats.graphColors.members,
                        backgroundColor: this.createGradient(config.stats.graphColors.members),
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Entradas',
                        data: data.joins,
                        borderColor: config.stats.graphColors.joins,
                        backgroundColor: 'transparent',
                        borderDash: [5, 5],
                        tension: 0.4
                    },
                    {
                        label: 'Saídas',
                        data: data.leaves,
                        borderColor: config.stats.graphColors.leaves,
                        backgroundColor: 'transparent',
                        borderDash: [5, 5],
                        tension: 0.4
                    }
                ]
            },
            options: this.getDefaultOptions('Estatísticas de Membros')
        };

        return await this.chartJSNodeCanvas.renderToBuffer(options);
    }

    async createMessageGraph(data, days) {
        const options = {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Mensagens',
                        data: data.messages,
                        backgroundColor: this.createGradient(config.stats.graphColors.messages),
                        borderColor: config.stats.graphColors.messages,
                        borderWidth: 1
                    }
                ]
            },
            options: this.getDefaultOptions('Estatísticas de Mensagens')
        };

        return await this.chartJSNodeCanvas.renderToBuffer(options);
    }

    async createVoiceGraph(data, days) {
        const options = {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Tempo em Call (horas)',
                        data: data.voiceTime.map(minutes => minutes / 60),
                        borderColor: config.stats.graphTypes.voice.color,
                        backgroundColor: this.createGradient(config.stats.graphTypes.voice.color),
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: this.getDefaultOptions('Estatísticas de Chamadas de Voz')
        };

        return await this.chartJSNodeCanvas.renderToBuffer(options);
    }

    getDefaultOptions(title) {
        return {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: config.stats.fonts.title,
                    color: config.stats.fonts.title.color
                },
                legend: {
                    display: true,
                    labels: {
                        font: config.stats.fonts.legend,
                        color: config.stats.fonts.legend.color
                    }
                },
                datalabels: {
                    color: '#ffffff',
                    anchor: 'end',
                    align: 'top',
                    offset: 5,
                    font: {
                        size: 11
                    },
                    formatter: (value) => value.toLocaleString()
                }
            },
            scales: {
                x: {
                    grid: {
                        color: config.stats.graphColors.grid
                    },
                    ticks: {
                        font: config.stats.fonts.axis,
                        color: config.stats.fonts.axis.color
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: config.stats.graphColors.grid
                    },
                    ticks: {
                        font: config.stats.fonts.axis,
                        color: config.stats.fonts.axis.color,
                        callback: (value) => value.toLocaleString()
                    }
                }
            },
            animation: false,
            elements: {
                point: {
                    radius: 3,
                    hoverRadius: 5
                }
            }
        };
    }

    createGradient(color) {
        return {
            type: 'gradient',
            colorStops: [
                { offset: 0, color: `${color}66` },
                { offset: 1, color: `${color}00` }
            ]
        };
    }
}

export default new ChartBuilder();

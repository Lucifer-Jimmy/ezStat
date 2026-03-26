/**
 * chart.js — ECharts wrapper with Apple/Linear minimalist theme
 */

(function () {
    const LIGHT_COLORS = {
        primary: '#3b82f6',
        primaryLight: '#60a5fa',
        primarySoft: 'rgba(59, 130, 246, 0.1)',
        success: '#22c55e',
        successSoft: 'rgba(34, 197, 94, 0.1)',
        danger: '#f43f5e',
        dangerSoft: 'rgba(244, 63, 94, 0.08)',
        warning: '#f59e0b',
        info: '#06b6d4',
        accent: '#8b5cf6',
        text: '#1e293b',
        textMuted: '#64748b',
        border: 'rgba(0, 0, 0, 0.08)',
        bg: '#ffffff',
        tooltipBg: 'rgba(255,255,255,0.92)',
        pieBorder: '#f0f2f8'
    };

    const DARK_COLORS = {
        primary: '#3b82f6',
        primaryLight: '#60a5fa',
        primarySoft: 'rgba(59, 130, 246, 0.15)',
        success: '#4ade80',
        successSoft: 'rgba(74, 222, 128, 0.12)',
        danger: '#fb7185',
        dangerSoft: 'rgba(251, 113, 133, 0.1)',
        warning: '#fbbf24',
        info: '#22d3ee',
        accent: '#a78bfa',
        text: '#f1f5f9',
        textMuted: '#94a3b8',
        border: 'rgba(255, 255, 255, 0.08)',
        bg: '#0f172a',
        tooltipBg: 'rgba(15, 23, 42, 0.9)',
        pieBorder: 'rgba(255,255,255,0.05)'
    };

    function isDark() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    }

    function COLORS() {
        return isDark() ? DARK_COLORS : LIGHT_COLORS;
    }

    const PIE_COLORS = [
        '#3b82f6', '#f59e0b', '#22c55e', '#f43f5e', '#8b5cf6',
        '#06b6d4', '#ec4899', '#14b8a6', '#a855f7', '#64748b'
    ];

    const defaultOpts = {
        renderer: 'canvas',
        locale: 'ZH'
    };

    window.ChartUtil = {
        create(domId, type) {
            const dom = document.getElementById(domId);
            if (!dom) return null;
            const chart = echarts.init(dom, null, defaultOpts);
            return chart;
        },

        dispose(domId) {
            const dom = document.getElementById(domId);
            if (dom && dom._echarts_instance) {
                echarts.getInstanceByDom(dom)?.dispose();
            }
        },

        resizeAll() {
            document.querySelectorAll('[_echarts_instance_]').forEach(dom => {
                const instance = echarts.getInstanceByDom(dom);
                if (instance) instance.resize();
            });
        },

        trendLine(domId, months, incomeData, expenseData) {
            const chart = ChartUtil.create(domId, 'line');
            if (!chart) return;

            const option = {
                backgroundColor: 'transparent',
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: COLORS().tooltipBg,
                    borderColor: COLORS().border,
                    borderWidth: 1,
                    extraCssText: 'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.2);',
                    textStyle: { color: COLORS().text, fontSize: 13 },
                    formatter(params) {
                        let html = `<div style="font-weight:600;margin-bottom:6px">${params[0].axisValue}</div>`;
                        params.forEach(p => {
                            html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:2px">
                                <span style="width:8px;height:8px;border-radius:50%;background:${p.color};box-shadow:0 0 6px ${p.color}"></span>
                                <span style="flex:1;color:${COLORS().textMuted}">${p.seriesName}</span>
                                <span style="font-weight:600">¥${Number(p.value).toLocaleString('zh-CN', {minimumFractionDigits:2})}</span>
                            </div>`;
                        });
                        return html;
                    }
                },
                legend: {
                    data: ['收入', '支出'],
                    bottom: 0,
                    textStyle: { color: COLORS().textMuted, fontSize: 12 },
                    icon: 'circle',
                    itemWidth: 8,
                    itemHeight: 8
                },
                grid: { top: 10, right: 20, bottom: 40, left: 60, containLabel: false },
                xAxis: {
                    type: 'category',
                    data: months,
                    axisLine: { lineStyle: { color: COLORS().border } },
                    axisTick: { show: false },
                    axisLabel: { color: COLORS().textMuted, fontSize: 12 }
                },
                yAxis: {
                    type: 'value',
                    axisLine: { show: false },
                    axisTick: { show: false },
                    splitLine: { lineStyle: { color: COLORS().border, type: 'dashed' } },
                    axisLabel: {
                        color: COLORS().textMuted,
                        fontSize: 12,
                        formatter: v => '¥' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)
                    }
                },
                series: [
                    {
                        name: '收入',
                        type: 'line',
                        data: incomeData,
                        smooth: 0.3,
                        symbol: 'circle',
                        symbolSize: 6,
                        lineStyle: { width: 2.5, color: COLORS().success, shadowBlur: 8, shadowColor: COLORS().success },
                        itemStyle: { color: COLORS().success, shadowBlur: 6, shadowColor: COLORS().success },
                        areaStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: isDark() ? 'rgba(48,209,88,0.1)' : 'rgba(52,199,89,0.08)' },
                                { offset: 1, color: 'rgba(52,199,89,0)' }
                            ])
                        }
                    },
                    {
                        name: '支出',
                        type: 'line',
                        data: expenseData,
                        smooth: 0.3,
                        symbol: 'circle',
                        symbolSize: 6,
                        lineStyle: { width: 2.5, color: COLORS().danger, shadowBlur: 8, shadowColor: COLORS().danger },
                        itemStyle: { color: COLORS().danger, shadowBlur: 6, shadowColor: COLORS().danger },
                        areaStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: isDark() ? 'rgba(255,69,58,0.1)' : 'rgba(255,59,48,0.06)' },
                                { offset: 1, color: 'rgba(255,59,48,0)' }
                            ])
                        }
                    }
                ],
                animation: true,
                animationDuration: 600,
                animationEasing: 'cubicOut'
            };

            chart.setOption(option);
            return chart;
        },

        donut(domId, data, colorList) {
            const chart = ChartUtil.create(domId, 'pie');
            if (!chart) return;

            const validData = data.filter(d => d.value > 0);
            const colors = colorList || PIE_COLORS;

            const option = {
                backgroundColor: 'transparent',
                tooltip: {
                    trigger: 'item',
                    backgroundColor: COLORS().tooltipBg,
                    borderColor: COLORS().border,
                    borderWidth: 1,
                    extraCssText: 'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.2);',
                    textStyle: { color: COLORS().text, fontSize: 13 },
                    formatter(p) {
                        return `<b>${p.name}</b><br/>
                            金额: ¥${Number(p.value).toLocaleString('zh-CN', {minimumFractionDigits:2})}<br/>
                            占比: ${p.percent}%`;
                    }
                },
                legend: {
                    orient: 'vertical',
                    right: 10,
                    top: 'center',
                    textStyle: { color: COLORS().textMuted, fontSize: 12 },
                    icon: 'circle',
                    itemWidth: 8,
                    itemHeight: 8,
                    itemGap: 10
                },
                series: [{
                    type: 'pie',
                    radius: ['50%', '78%'],
                    center: ['35%', '50%'],
                    avoidLabelOverlap: true,
                    label: { show: false },
                    labelLine: { show: false },
                    data: validData.map((d, i) => ({
                        name: d.name,
                        value: d.value,
                        itemStyle: { color: colors[i % colors.length], borderRadius: 3, borderWidth: 2, borderColor: COLORS().pieBorder }
                    })),
                    emphasis: {
                        scale: true,
                        scaleSize: 6,
                        itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.1)' }
                    },
                    animationType: 'expansion',
                    animationDuration: 600,
                    animationEasing: 'cubicOut'
                }]
            };

            chart.setOption(option);
            return chart;
        },

        gauge(domId, percent, color) {
            const chart = ChartUtil.create(domId, 'gauge');
            if (!chart) return;

            const c = percent >= 100 ? COLORS().danger : (percent >= 80 ? COLORS().warning : color || COLORS().primary);
            const option = {
                backgroundColor: 'transparent',
                series: [{
                    type: 'gauge',
                    startAngle: 200,
                    endAngle: -20,
                    radius: '90%',
                    center: ['50%', '60%'],
                    pointer: { show: false },
                    progress: {
                        show: true,
                        overlap: false,
                        roundCap: true,
                        clip: false,
                        itemStyle: { color: c }
                    },
                    axisLine: { lineStyle: { width: 10, color: [[1, COLORS().border]] } },
                    axisTick: { show: false },
                    splitLine: { show: false },
                    axisLabel: { show: false },
                    data: [{ value: Math.min(percent, 100), name: '' }],
                    title: { show: false },
                    detail: {
                        valueAnimation: true,
                        fontSize: 20,
                        fontWeight: '700',
                        color: COLORS().text,
                        formatter: '{d}%',
                        offsetCenter: [0, '30%']
                    }
                }],
                animation: true,
                animationDuration: 800,
                animationEasing: 'cubicOut'
            };

            chart.setOption(option);
            return chart;
        },

        barHorizontal(domId, data, color) {
            const chart = ChartUtil.create(domId, 'bar');
            if (!chart) return;

            const option = {
                backgroundColor: 'transparent',
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'shadow' },
                    backgroundColor: COLORS().tooltipBg,
                    borderColor: COLORS().border,
                    extraCssText: 'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.2);',
                    textStyle: { color: COLORS().text, fontSize: 13 },
                    formatter(p) {
                        return `${p[0].name}<br/><b>¥${Number(p[0].value).toLocaleString('zh-CN', {minimumFractionDigits:2})}</b>`;
                    }
                },
                grid: { top: 10, right: 20, bottom: 10, left: 10, containLabel: true },
                xAxis: { type: 'value', show: false },
                yAxis: {
                    type: 'category',
                    data: data.map(d => d.name).reverse(),
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: { color: COLORS().textMuted, fontSize: 12, width: 80, overflow: 'truncate' }
                },
                series: [{
                    type: 'bar',
                    data: data.map(d => d.value).reverse(),
                    barWidth: 12,
                    itemStyle: {
                        color: color || COLORS().primary,
                        borderRadius: [0, 6, 6, 0]
                    },
                    label: {
                        show: true,
                        position: 'right',
                        color: COLORS().textMuted,
                        fontSize: 12,
                        formatter: v => '¥' + Number(v.value).toLocaleString('zh-CN', {minimumFractionDigits:0})
                    },
                    animationDelay: (idx) => idx * 40
                }],
                animation: true,
                animationDuration: 600,
                animationEasing: 'cubicOut'
            };

            chart.setOption(option);
            return chart;
        }
    };
})();

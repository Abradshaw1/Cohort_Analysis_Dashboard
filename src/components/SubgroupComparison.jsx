import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function SubgroupComparison({
  data,
  selectedIndices,
  pinnedIndices
}) {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 400;
    const height = 300;
    const margin = { top: 40, right: 20, bottom: 60, left: 100 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const computeStats = (indices) => {
      if (!indices || indices.length === 0) return null;
      const subset = indices.map(i => data[i]).filter(d => d);
      if (subset.length === 0) return null;
      return {
        avgAge: d3.mean(subset, d => d.age) || 0,
        avgBMI: d3.mean(subset, d => d.BMI) || 0,
        avgSysBP: d3.mean(subset, d => d.sysBP) || 0,
        pctDiabetes: (subset.filter(d => d.diabetes === 1).length / subset.length) * 100 || 0,
        pctCHD: (subset.filter(d => d.TenYearCHD === 1).length / subset.length) * 100 || 0
      };
    };

    const fullStats = computeStats(data.map((_, i) => i));
    if (!fullStats) return;

    const selectedStats = selectedIndices.length > 0 ? computeStats(selectedIndices) : null;
    const pinnedStats = pinnedIndices.length > 0 ? computeStats(pinnedIndices) : null;

    const metrics = [
      { key: 'avgAge', label: 'Avg Age', unit: 'yrs' },
      { key: 'avgBMI', label: 'Avg BMI', unit: '' },
      { key: 'avgSysBP', label: 'Avg Sys BP', unit: 'mmHg' },
      { key: 'pctDiabetes', label: 'Diabetes %', unit: '%' },
      { key: 'pctCHD', label: 'CHD Risk %', unit: '%' }
    ];

    const y = d3.scaleBand()
      .domain(metrics.map(m => m.label))
      .range([0, innerHeight])
      .padding(0.3);

    const maxValues = metrics.map(m => {
      const values = [fullStats[m.key]];
      if (selectedStats) values.push(selectedStats[m.key]);
      if (pinnedStats) values.push(pinnedStats[m.key]);
      return d3.max(values);
    });

    const x = d3.scaleLinear()
      .domain([0, d3.max(maxValues)])
      .range([0, innerWidth]);

    g.append('g')
      .call(d3.axisLeft(y))
      .selectAll('text')
      .style('font-size', '11px');

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(5))
      .selectAll('text')
      .style('font-size', '10px');

    const barHeight = y.bandwidth() / 3;

    metrics.forEach((m, i) => {
      const yPos = y(m.label);

      g.append('rect')
        .attr('x', 0)
        .attr('y', yPos)
        .attr('width', x(fullStats[m.key]))
        .attr('height', barHeight)
        .attr('fill', '#95a5a6')
        .attr('opacity', 0.6);

      g.append('text')
        .attr('x', x(fullStats[m.key]) + 3)
        .attr('y', yPos + barHeight / 2)
        .attr('dy', '0.35em')
        .style('font-size', '9px')
        .text(fullStats[m.key]?.toFixed(1));

      if (pinnedStats) {
        g.append('rect')
          .attr('x', 0)
          .attr('y', yPos + barHeight)
          .attr('width', x(pinnedStats[m.key]))
          .attr('height', barHeight)
          .attr('fill', '#e67e22')
          .attr('opacity', 0.8);

        g.append('text')
          .attr('x', x(pinnedStats[m.key]) + 3)
          .attr('y', yPos + barHeight * 1.5)
          .attr('dy', '0.35em')
          .style('font-size', '9px')
          .text(pinnedStats[m.key]?.toFixed(1));
      }

      if (selectedStats) {
        g.append('rect')
          .attr('x', 0)
          .attr('y', yPos + barHeight * 2)
          .attr('width', x(selectedStats[m.key]))
          .attr('height', barHeight)
          .attr('fill', '#3498db')
          .attr('opacity', 0.8);

        g.append('text')
          .attr('x', x(selectedStats[m.key]) + 3)
          .attr('y', yPos + barHeight * 2.5)
          .attr('dy', '0.35em')
          .style('font-size', '9px')
          .text(selectedStats[m.key]?.toFixed(1));
      }
    });

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('Subgroup Comparison');

    const legend = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${height - 40})`);

    const legendData = [
      { label: 'Full Cohort', color: '#95a5a6' },
      ...(pinnedStats ? [{ label: 'Pinned', color: '#e67e22' }] : []),
      ...(selectedStats ? [{ label: 'Selected', color: '#3498db' }] : [])
    ];

    legendData.forEach((d, i) => {
      legend.append('rect')
        .attr('x', i * 100)
        .attr('y', 0)
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', d.color);

      legend.append('text')
        .attr('x', i * 100 + 16)
        .attr('y', 10)
        .style('font-size', '10px')
        .text(d.label);
    });

  }, [data, selectedIndices, pinnedIndices]);

  return <svg ref={svgRef}></svg>;
}

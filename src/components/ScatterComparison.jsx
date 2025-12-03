import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export default function ScatterComparison({ data, selectedIndices, pinnedIndices, metadata }) {
  const svgRef = useRef();
  const [xFeature, setXFeature] = useState('age');
  const [yFeature, setYFeature] = useState('cigsPerDay');

  const continuousFeatures = [
    'age', 'cigsPerDay', 'totChol', 'sysBP', 'diaBP',
    'BMI', 'heartRate', 'glucose'
  ];

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const width = 500;
    const height = 400;
    const margin = { top: 40, right: 20, bottom: 60, left: 70 };

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const validData = data.filter(d =>
      d[xFeature] !== null &&
      d[xFeature] !== undefined &&
      !isNaN(d[xFeature]) &&
      d[yFeature] !== null &&
      d[yFeature] !== undefined &&
      !isNaN(d[yFeature])
    );

    const xScale = d3.scaleLinear()
      .domain(d3.extent(validData, d => d[xFeature]))
      .range([0, chartWidth])
      .nice();

    const yScale = d3.scaleLinear()
      .domain(d3.extent(validData, d => d[yFeature]))
      .range([chartHeight, 0])
      .nice();

    g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale).ticks(8))
      .style('font-size', '11px');

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(8))
      .style('font-size', '11px');

    g.append('text')
      .attr('x', chartWidth / 2)
      .attr('y', chartHeight + 45)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '500')
      .text(metadata[xFeature]?.label || xFeature);

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -chartHeight / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '500')
      .text(metadata[yFeature]?.label || yFeature);

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', '600')
      .text('Group Comparison Scatter Plot');

    const selectedSet = new Set(selectedIndices);
    const pinnedSet = new Set(pinnedIndices);

    validData.forEach((d, i) => {
      const originalIndex = data.indexOf(d);
      const isSelected = selectedSet.has(originalIndex);
      const isPinned = pinnedSet.has(originalIndex);

      let color = '#ccc';
      let radius = 2;
      let opacity = 0.4;

      if (isPinned) {
        color = '#e74c3c';
        radius = 3.5;
        opacity = 0.7;
      } else if (isSelected) {
        color = '#3498db';
        radius = 3.5;
        opacity = 0.7;
      }

      g.append('circle')
        .attr('cx', xScale(d[xFeature]))
        .attr('cy', yScale(d[yFeature]))
        .attr('r', radius)
        .attr('fill', color)
        .attr('opacity', opacity);
    });

    if (pinnedIndices.length > 0 || selectedIndices.length > 0) {
      const legend = svg.append('g')
        .attr('transform', `translate(${width - 150}, 40)`);

      let yOffset = 0;

      if (pinnedIndices.length > 0) {
        legend.append('circle')
          .attr('cx', 0)
          .attr('cy', yOffset)
          .attr('r', 4)
          .attr('fill', '#e74c3c')
          .attr('opacity', 0.7);

        legend.append('text')
          .attr('x', 10)
          .attr('y', yOffset)
          .attr('dy', '0.35em')
          .style('font-size', '11px')
          .text(`Pinned (${pinnedIndices.length})`);

        yOffset += 18;
      }

      if (selectedIndices.length > 0) {
        legend.append('circle')
          .attr('cx', 0)
          .attr('cy', yOffset)
          .attr('r', 4)
          .attr('fill', '#3498db')
          .attr('opacity', 0.7);

        legend.append('text')
          .attr('x', 10)
          .attr('y', yOffset)
          .attr('dy', '0.35em')
          .style('font-size', '11px')
          .text(`Selected (${selectedIndices.length})`);
      }
    }

  }, [data, xFeature, yFeature, selectedIndices, pinnedIndices, metadata]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      <div style={{
        display: 'flex',
        gap: '20px',
        marginBottom: '15px',
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: '500' }}>X-axis:</label>
          <select
            value={xFeature}
            onChange={(e) => setXFeature(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            {continuousFeatures.map(f => (
              <option key={f} value={f}>{metadata[f]?.label || f}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: '500' }}>Y-axis:</label>
          <select
            value={yFeature}
            onChange={(e) => setYFeature(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            {continuousFeatures.map(f => (
              <option key={f} value={f}>{metadata[f]?.label || f}</option>
            ))}
          </select>
        </div>
      </div>
      <svg ref={svgRef}></svg>
    </div>
  );
}

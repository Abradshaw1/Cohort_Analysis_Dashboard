import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function FeatureDistribution({
  data,
  feature,
  metadata,
  selectedIndices,
  onBrush
}) {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || !feature || !metadata) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 280;
    const height = 120;
    const margin = { top: 20, right: 20, bottom: 30, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const validData = data.filter(d => d[feature] !== null && !isNaN(d[feature]));
    const meta = metadata[feature];

    if (meta.type === 'categorical' || meta.type === 'ordinal') {
      const counts = {};
      meta.domain.forEach(val => counts[val] = 0);
      validData.forEach(d => {
        counts[d[feature]] = (counts[d[feature]] || 0) + 1;
      });

      const barData = meta.domain.map(val => ({
        value: val,
        count: counts[val] || 0,
        label: meta.labels ? meta.labels[val] : val
      }));

      const x = d3.scaleBand()
        .domain(barData.map(d => d.value))
        .range([0, innerWidth])
        .padding(0.2);

      const y = d3.scaleLinear()
        .domain([0, d3.max(barData, d => d.count)])
        .range([innerHeight, 0]);

      g.selectAll('.bar')
        .data(barData)
        .join('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.value))
        .attr('y', d => y(d.count))
        .attr('width', x.bandwidth())
        .attr('height', d => innerHeight - y(d.count))
        .attr('fill', '#4a90e2')
        .attr('stroke', '#333')
        .attr('stroke-width', 0.5)
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
          const indices = data
            .map((row, i) => row[feature] === d.value ? i : -1)
            .filter(i => i !== -1);
          onBrush(indices);
        });

      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).tickFormat((d, i) => barData[i].label))
        .selectAll('text')
        .style('font-size', '10px');

      g.append('g')
        .call(d3.axisLeft(y).ticks(4))
        .selectAll('text')
        .style('font-size', '10px');

    } else {
      const values = validData.map(d => d[feature]);
      const [min, max] = d3.extent(values);

      const bins = d3.bin()
        .domain([min, max])
        .thresholds(20)(values);

      const x = d3.scaleLinear()
        .domain([min, max])
        .range([0, innerWidth]);

      const y = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length)])
        .range([innerHeight, 0]);

      // green gradient color scale based on bin position
      const colorScale = d3.scaleSequential(d3.interpolateGreens)
        .domain([min, max]);

      const brush = d3.brushX()
        .extent([[0, 0], [innerWidth, innerHeight]])
        .on('end', (event) => {
          if (!event.selection) {
            onBrush([]);
            return;
          }
          const [x0, x1] = event.selection.map(x.invert);
          const indices = data
            .map((row, i) => {
              const val = row[feature];
              return val !== null && val >= x0 && val <= x1 ? i : -1;
            })
            .filter(i => i !== -1);
          onBrush(indices);
        });

      g.selectAll('.bar')
        .data(bins)
        .join('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.x0))
        .attr('y', d => y(d.length))
        .attr('width', d => Math.max(0, x(d.x1) - x(d.x0) - 1))
        .attr('height', d => innerHeight - y(d.length))
        .attr('fill', d => colorScale((d.x0 + d.x1) / 2))
        .attr('stroke', '#333')
        .attr('stroke-width', 0.5);

      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(5))
        .selectAll('text')
        .style('font-size', '10px');

      g.append('g')
        .call(d3.axisLeft(y).ticks(4))
        .selectAll('text')
        .style('font-size', '10px');

      g.append('g')
        .attr('class', 'brush')
        .call(brush);
    }

    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text(meta.label);

  }, [data, feature, metadata, selectedIndices, onBrush]);

  return <svg ref={svgRef}></svg>;
}

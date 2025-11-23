import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function PCAView({
  data,
  projection,
  validIndices,
  colorFeature,
  metadata,
  selectedIndices,
  onBrush,
  pcaInfo
}) {
  const svgRef = useRef();

  useEffect(() => {
    if (!projection || projection.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 500;
    const height = 500;
    const margin = { top: 40, right: 40, bottom: 50, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xExtent = d3.extent(projection, d => d.x);
    const yExtent = d3.extent(projection, d => d.y);

    const x = d3.scaleLinear()
      .domain(xExtent)
      .range([0, innerWidth]);

    const y = d3.scaleLinear()
      .domain(yExtent)
      .range([innerHeight, 0]);

    let colorScale;
    if (colorFeature && metadata[colorFeature]) {
      const meta = metadata[colorFeature];
      if (meta.type === 'categorical' || meta.type === 'ordinal') {
        colorScale = d3.scaleOrdinal()
          .domain(meta.domain)
          .range(['#e74c3c', '#3498db', '#2ecc71', '#f39c12']);
      } else {
        const values = data.map(d => d[colorFeature]).filter(v => v !== null);
        colorScale = d3.scaleSequential(d3.interpolateViridis)
          .domain(d3.extent(values));
      }
    } else {
      colorScale = () => '#4a90e2';
    }

    const points = projection.map((p, i) => ({
      x: p.x,
      y: p.y,
      dataIndex: validIndices[i],
      colorValue: colorFeature ? data[validIndices[i]][colorFeature] : null
    }));

    const selectedSet = new Set(selectedIndices);

    g.selectAll('.point')
      .data(points)
      .join('circle')
      .attr('class', 'point')
      .attr('cx', d => x(d.x))
      .attr('cy', d => y(d.y))
      .attr('r', d => selectedSet.has(d.dataIndex) ? 4 : 3)
      .attr('fill', d => d.colorValue !== null ? colorScale(d.colorValue) : '#4a90e2')
      .attr('opacity', d => selectedIndices.length === 0 ? 0.6 : (selectedSet.has(d.dataIndex) ? 1 : 0.2))
      .attr('stroke', d => selectedSet.has(d.dataIndex) ? '#000' : 'none')
      .attr('stroke-width', 1);

    const brush = d3.brush()
      .extent([[0, 0], [innerWidth, innerHeight]])
      .on('end', (event) => {
        if (!event.selection) {
          onBrush([]);
          return;
        }
        const [[x0, y0], [x1, y1]] = event.selection;
        const brushed = points
          .filter(p => {
            const px = x(p.x);
            const py = y(p.y);
            return px >= x0 && px <= x1 && py >= y0 && py <= y1;
          })
          .map(p => p.dataIndex);
        onBrush(brushed);
      });

    g.append('g')
      .attr('class', 'brush')
      .call(brush);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(6))
      .selectAll('text')
      .style('font-size', '11px');

    g.append('g')
      .call(d3.axisLeft(y).ticks(6))
      .selectAll('text')
      .style('font-size', '11px');

    const pc1Label = pcaInfo?.varExplained
      ? `PC1 (${pcaInfo.varExplained[0].toFixed(1)}% var.)`
      : 'PC1';
    const pc2Label = pcaInfo?.varExplained
      ? `PC2 (${pcaInfo.varExplained[1].toFixed(1)}% var.)`
      : 'PC2';

    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 35)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text(pc1Label);

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -35)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text(pc2Label);

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('PCA Projection');

    if (pcaInfo?.features) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', 38)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', '#666')
        .text(`Projecting: ${pcaInfo.features.join(', ')}`);
    }

    // Add legend for color encoding (top right, below subtitle)
    if (colorFeature && metadata[colorFeature]) {
      const meta = metadata[colorFeature];
      const legendX = width - 130;
      const legendY = 55;

      const legendTitle = svg.append('text')
        .attr('x', legendX)
        .attr('y', legendY)
        .style('font-size', '11px')
        .style('font-weight', 'bold')
        .text(`Color: ${meta.label}`);

      // Get the width of the legend title to align items with the right edge
      const titleNode = legendTitle.node();
      const titleWidth = titleNode ? titleNode.getBBox().width : 120;

      if (meta.type === 'categorical' || meta.type === 'ordinal') {
        const legend = svg.append('g')
          .attr('transform', `translate(${legendX}, ${legendY + 8})`);

        meta.domain.forEach((value, i) => {
          const labelText = meta.labels ? meta.labels[value] : value;

          const textElem = legend.append('text')
            .attr('x', titleWidth)
            .attr('y', i * 16 + 4)
            .attr('text-anchor', 'end')
            .style('font-size', '10px')
            .text(labelText);

          const textWidth = textElem.node().getBBox().width;

          legend.append('circle')
            .attr('cx', titleWidth - textWidth - 10)
            .attr('cy', i * 16)
            .attr('r', 4)
            .attr('fill', colorScale(value));
        });
      } else {
        // Continuous legend
        const legendWidth = 120;
        const legendHeight = 10;

        const defs = svg.append('defs');
        const gradient = defs.append('linearGradient')
          .attr('id', 'color-gradient');

        for (let i = 0; i <= 10; i++) {
          const t = i / 10;
          const value = colorScale.domain()[0] + t * (colorScale.domain()[1] - colorScale.domain()[0]);
          gradient.append('stop')
            .attr('offset', `${t * 100}%`)
            .attr('stop-color', colorScale(value));
        }

        svg.append('rect')
          .attr('x', legendX)
          .attr('y', legendY + 10)
          .attr('width', legendWidth)
          .attr('height', legendHeight)
          .style('fill', 'url(#color-gradient)');

        svg.append('text')
          .attr('x', legendX)
          .attr('y', legendY + legendHeight + 22)
          .style('font-size', '9px')
          .text(colorScale.domain()[0].toFixed(1));

        svg.append('text')
          .attr('x', legendX + legendWidth)
          .attr('y', legendY + legendHeight + 22)
          .attr('text-anchor', 'end')
          .style('font-size', '9px')
          .text(colorScale.domain()[1].toFixed(1));
      }
    }

  }, [projection, validIndices, data, colorFeature, metadata, selectedIndices, onBrush, pcaInfo]);

  return <svg ref={svgRef}></svg>;
}

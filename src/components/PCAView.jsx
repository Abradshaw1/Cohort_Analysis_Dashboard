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
  pcaInfo,
  clusteringMethod,
  isComputing
}) {
  const svgRef = useRef();

  useEffect(() => {
    if (!projection || projection.length === 0 || isComputing) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 500;
    const height = 500;
    const margin = { top: 80, right: 40, bottom: 50, left: 50 };
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

    // figure out metadata and whether this feature is categorical
    const meta = colorFeature && metadata[colorFeature]
      ? metadata[colorFeature]
      : null;

    const isCategorical =
      meta && (meta.type === 'categorical' || meta.type === 'ordinal');

    // only build a d3 color scale for categorical features
    let colorScale = null;
    if (isCategorical) {
      colorScale = d3.scaleOrdinal()
        .domain(meta.domain)
        .range(['#e74c3c', '#3498db', '#2ecc71', '#f39c12']);
    }

    const points = projection.map((p, i) => ({
      x: p.x,
      y: p.y,
      dataIndex: validIndices[i],
      colorValue: colorFeature ? data[validIndices[i]][colorFeature] : 'default'
    }));

    const selectedSet = new Set(selectedIndices);

    g.selectAll('.point')
      .data(points)
      .join('circle')
      .attr('class', 'point')
      .attr('cx', d => x(d.x))
      .attr('cy', d => y(d.y))
      .attr('r', d => selectedSet.has(d.dataIndex) ? 4 : 3)
      .attr('fill', d => {
        // continuous or no color feature → all green
        if (!isCategorical) {
          return '#2ecc71';
        }

        // categorical case → use scale for valid values
        const v = d.colorValue;
        if (v === 'default' || v == null) {
          return '#2ecc71';
        }
        return colorScale(v);
      })
      .attr('opacity', d =>
        selectedIndices.length === 0 ? 0.6 :
        (selectedSet.has(d.dataIndex) ? 1 : 0.2)
      )
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

    let xLabel;
    let yLabel;
    if (clusteringMethod === 'PCA') {
      xLabel = pcaInfo?.varExplained
        ? `PC1 (${pcaInfo.varExplained[0].toFixed(1)}% var.)`
        : 'PC1';
      yLabel = pcaInfo?.varExplained
        ? `PC2 (${pcaInfo.varExplained[1].toFixed(1)}% var.)`
        : 'PC2';
    } else if (clusteringMethod === 'UMAP') {
      xLabel = 'UMAP Dimension 1';
      yLabel = 'UMAP Dimension 2';
    } else {
      xLabel = 'Dimension 1';
      yLabel = 'Dimension 2';
    }

    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 35)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text(xLabel);

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -35)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .text(yLabel);

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text(`${clusteringMethod} Projection`);

    if (pcaInfo?.features) {
      const foreignObj = svg.append('foreignObject')
        .attr('x', margin.left)
        .attr('y', 32)
        .attr('width', innerWidth)
        .attr('height', 45);

      foreignObj.append('xhtml:div')
        .style('font-size', '10px')
        .style('color', '#666')
        .style('text-align', 'center')
        .style('line-height', '1.3')
        .html(`<strong>Features:</strong> ${pcaInfo.features.join(', ')}`);
    }

    // legend only for categorical features
    if (colorFeature && meta && isCategorical) {
      const legendX = width - 130;
      const legendY = 85;

      const legendTitle = svg.append('text')
        .attr('x', legendX)
        .attr('y', legendY)
        .style('font-size', '11px')
        .style('font-weight', 'bold')
        .text(`Color: ${meta.label}`);

      const titleNode = legendTitle.node();
      const titleWidth = titleNode ? titleNode.getBBox().width : 120;

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
    }

  }, [
    projection,
    validIndices,
    data,
    colorFeature,
    metadata,
    selectedIndices,
    onBrush,
    pcaInfo,
    clusteringMethod,
    isComputing
  ]);

  if (isComputing) {
    return (
      <div style={{
        width: '500px',
        height: '500px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '20px'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '5px solid #f3f3f3',
          borderTop: '5px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          Computing {clusteringMethod} projection...
        </div>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  return <svg ref={svgRef}></svg>;
}

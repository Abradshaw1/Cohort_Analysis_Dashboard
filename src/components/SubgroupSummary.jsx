import * as d3 from 'd3';

export default function SubgroupSummary({ data, selectedIndices, metadata }) {
  if (!data || selectedIndices.length === 0) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        minHeight: '280px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666'
      }}>
        <p>Select a subgroup using brushing to see summary statistics</p>
      </div>
    );
  }

  const subset = selectedIndices.map(i => data[i]);

  const stats = {
    n: subset.length,
    avgAge: d3.mean(subset, d => d.age),
    avgBMI: d3.mean(subset, d => d.BMI),
    avgCholesterol: d3.mean(subset, d => d.totChol),
    avgSysBP: d3.mean(subset, d => d.sysBP),
    pctMale: (subset.filter(d => d.male === 1).length / subset.length) * 100,
    pctSmoker: (subset.filter(d => d.currentSmoker === 1).length / subset.length) * 100,
    pctDiabetes: (subset.filter(d => d.diabetes === 1).length / subset.length) * 100,
    pctHypertension: (subset.filter(d => d.prevalentHyp === 1).length / subset.length) * 100,
    pctCHD: (subset.filter(d => d.TenYearCHD === 1).length / subset.length) * 100
  };

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      minHeight: '280px'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '16px', fontWeight: 'bold' }}>
        Subgroup Summary
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
        <div><strong>Sample Size:</strong> {stats.n}</div>
        <div><strong>Male:</strong> {stats.pctMale.toFixed(1)}%</div>
        <div><strong>Avg Age:</strong> {stats.avgAge?.toFixed(1)} yrs</div>
        <div><strong>Smoker:</strong> {stats.pctSmoker.toFixed(1)}%</div>
        <div><strong>Avg BMI:</strong> {stats.avgBMI?.toFixed(1)}</div>
        <div><strong>Diabetes:</strong> {stats.pctDiabetes.toFixed(1)}%</div>
        <div><strong>Avg Cholesterol:</strong> {stats.avgCholesterol?.toFixed(0)} mg/dL</div>
        <div><strong>Hypertension:</strong> {stats.pctHypertension.toFixed(1)}%</div>
        <div><strong>Avg Sys BP:</strong> {stats.avgSysBP?.toFixed(0)} mmHg</div>
        <div style={{ gridColumn: 'span 2', marginTop: '5px', padding: '8px', backgroundColor: stats.pctCHD > 20 ? '#ffe6e6' : '#e6f7ff', borderRadius: '4px' }}>
          <strong>10-Year CHD Risk:</strong> {stats.pctCHD.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

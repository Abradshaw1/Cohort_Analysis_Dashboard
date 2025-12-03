import { useState, useMemo } from 'react';
import * as d3 from 'd3';

export default function PersonalRiskCalculator({ data, metadata }) {
  const [userInputs, setUserInputs] = useState({
    male: '1',
    age: '50',
    currentSmoker: '0',
    cigsPerDay: '0',
    totChol: '200',
    sysBP: '120',
    diaBP: '80',
    BMI: '25',
    heartRate: '75',
    glucose: '85',
    BPMeds: '0',
    prevalentStroke: '0',
    prevalentHyp: '0',
    diabetes: '0'
  });

  const handleInputChange = (feature, value) => {
    setUserInputs(prev => ({
      ...prev,
      [feature]: value
    }));
  };

  const ranges = useMemo(() => {
    if (!data) return {};

    const continuousFeatures = ['age', 'cigsPerDay', 'totChol', 'sysBP', 'diaBP', 'BMI', 'heartRate', 'glucose'];
    const rangeData = {};

    continuousFeatures.forEach(feature => {
      const validValues = data.map(d => d[feature]).filter(v => v !== null && v !== undefined && !isNaN(v));
      const sorted = validValues.sort((a, b) => a - b);
      const p25 = d3.quantile(sorted, 0.25);
      const p50 = d3.quantile(sorted, 0.50);
      const p75 = d3.quantile(sorted, 0.75);
      const min = d3.min(sorted);
      const max = d3.max(sorted);

      rangeData[feature] = { min, max, p25, p50, p75 };
    });

    return rangeData;
  }, [data]);

  const calculatedRisk = useMemo(() => {
    if (!data || !ranges) return null;

    const userVector = [
      parseFloat(userInputs.age),
      parseFloat(userInputs.cigsPerDay),
      parseFloat(userInputs.totChol),
      parseFloat(userInputs.sysBP),
      parseFloat(userInputs.diaBP),
      parseFloat(userInputs.BMI),
      parseFloat(userInputs.heartRate),
      parseFloat(userInputs.glucose)
    ];

    const distances = data.map(person => {
      const personVector = [
        person.age,
        person.cigsPerDay || 0,
        person.totChol,
        person.sysBP,
        person.diaBP,
        person.BMI,
        person.heartRate,
        person.glucose
      ];

      const normalizedDist = userVector.map((val, i) => {
        const range = ranges[['age', 'cigsPerDay', 'totChol', 'sysBP', 'diaBP', 'BMI', 'heartRate', 'glucose'][i]];
        const normalized = (val - range.min) / (range.max - range.min);
        const personNormalized = (personVector[i] - range.min) / (range.max - range.min);
        return Math.pow(normalized - personNormalized, 2);
      }).reduce((sum, val) => sum + val, 0);

      return {
        distance: Math.sqrt(normalizedDist),
        hasCHD: person.TenYearCHD === 1
      };
    });

    distances.sort((a, b) => a.distance - b.distance);
    const k = 100;
    const neighbors = distances.slice(0, k);
    const chdCount = neighbors.filter(n => n.hasCHD).length;
    const riskPercentage = (chdCount / k) * 100;

    return riskPercentage;
  }, [data, userInputs, ranges]);

  const getRangeIndicator = (feature, value) => {
    if (!ranges[feature]) return '';
    const { p25, p50, p75 } = ranges[feature];
    const numValue = parseFloat(value);

    if (numValue < p25) return '(Lower)';
    if (numValue < p50) return '(Below Average)';
    if (numValue < p75) return '(Above Average)';
    return '(Higher)';
  };

  const getRangeColor = (feature, value) => {
    if (!ranges[feature]) return '#000';
    const { p25, p50, p75 } = ranges[feature];
    const numValue = parseFloat(value);

    if (feature === 'age') return '#666';

    const higherIsBad = ['cigsPerDay', 'totChol', 'sysBP', 'diaBP', 'BMI', 'glucose'].includes(feature);

    if (numValue < p25) return higherIsBad ? '#27ae60' : '#e74c3c';
    if (numValue < p50) return higherIsBad ? '#3498db' : '#f39c12';
    if (numValue < p75) return higherIsBad ? '#f39c12' : '#3498db';
    return higherIsBad ? '#e74c3c' : '#27ae60';
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      height: '100%',
      overflowY: 'auto'
    }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
        Personal Risk Calculator
      </h3>
      <p style={{
        margin: '0 0 15px 0',
        fontSize: '11px',
        color: '#e74c3c',
        fontStyle: 'italic'
      }}>
        * This CHD estimation is based on population data and is not a true reflection of individual risk.
        Consult a healthcare professional for accurate assessment.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Sex</label>
          <select
            value={userInputs.male}
            onChange={(e) => handleInputChange('male', e.target.value)}
            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="1">Male</option>
            <option value="0">Female</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Age (years)</label>
          <input
            type="number"
            value={userInputs.age}
            onChange={(e) => handleInputChange('age', e.target.value)}
            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Current Smoker</label>
          <select
            value={userInputs.currentSmoker}
            onChange={(e) => handleInputChange('currentSmoker', e.target.value)}
            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="0">No</option>
            <option value="1">Yes</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>
            Cigarettes Per Day
            <span style={{ color: getRangeColor('cigsPerDay', userInputs.cigsPerDay), marginLeft: '4px', fontSize: '10px' }}>
              {getRangeIndicator('cigsPerDay', userInputs.cigsPerDay)}
            </span>
          </label>
          <input
            type="number"
            value={userInputs.cigsPerDay}
            onChange={(e) => handleInputChange('cigsPerDay', e.target.value)}
            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          {ranges.cigsPerDay && (
            <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
              Normal: 0-{ranges.cigsPerDay.p50?.toFixed(0)}
            </div>
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>
            Total Cholesterol (mg/dL)
            <span style={{ color: getRangeColor('totChol', userInputs.totChol), marginLeft: '4px', fontSize: '10px' }}>
              {getRangeIndicator('totChol', userInputs.totChol)}
            </span>
          </label>
          <input
            type="number"
            value={userInputs.totChol}
            onChange={(e) => handleInputChange('totChol', e.target.value)}
            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          {ranges.totChol && (
            <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
              Normal: {ranges.totChol.p25?.toFixed(0)}-{ranges.totChol.p75?.toFixed(0)}
            </div>
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>
            Systolic BP (mmHg)
            <span style={{ color: getRangeColor('sysBP', userInputs.sysBP), marginLeft: '4px', fontSize: '10px' }}>
              {getRangeIndicator('sysBP', userInputs.sysBP)}
            </span>
          </label>
          <input
            type="number"
            value={userInputs.sysBP}
            onChange={(e) => handleInputChange('sysBP', e.target.value)}
            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          {ranges.sysBP && (
            <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
              Normal: {ranges.sysBP.p25?.toFixed(0)}-{ranges.sysBP.p75?.toFixed(0)}
            </div>
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>
            Diastolic BP (mmHg)
            <span style={{ color: getRangeColor('diaBP', userInputs.diaBP), marginLeft: '4px', fontSize: '10px' }}>
              {getRangeIndicator('diaBP', userInputs.diaBP)}
            </span>
          </label>
          <input
            type="number"
            value={userInputs.diaBP}
            onChange={(e) => handleInputChange('diaBP', e.target.value)}
            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          {ranges.diaBP && (
            <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
              Normal: {ranges.diaBP.p25?.toFixed(0)}-{ranges.diaBP.p75?.toFixed(0)}
            </div>
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>
            BMI
            <span style={{ color: getRangeColor('BMI', userInputs.BMI), marginLeft: '4px', fontSize: '10px' }}>
              {getRangeIndicator('BMI', userInputs.BMI)}
            </span>
          </label>
          <input
            type="number"
            step="0.1"
            value={userInputs.BMI}
            onChange={(e) => handleInputChange('BMI', e.target.value)}
            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          {ranges.BMI && (
            <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
              Normal: {ranges.BMI.p25?.toFixed(1)}-{ranges.BMI.p75?.toFixed(1)}
            </div>
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>
            Heart Rate (bpm)
            <span style={{ color: getRangeColor('heartRate', userInputs.heartRate), marginLeft: '4px', fontSize: '10px' }}>
              {getRangeIndicator('heartRate', userInputs.heartRate)}
            </span>
          </label>
          <input
            type="number"
            value={userInputs.heartRate}
            onChange={(e) => handleInputChange('heartRate', e.target.value)}
            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          {ranges.heartRate && (
            <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
              Normal: {ranges.heartRate.p25?.toFixed(0)}-{ranges.heartRate.p75?.toFixed(0)}
            </div>
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>
            Glucose (mg/dL)
            <span style={{ color: getRangeColor('glucose', userInputs.glucose), marginLeft: '4px', fontSize: '10px' }}>
              {getRangeIndicator('glucose', userInputs.glucose)}
            </span>
          </label>
          <input
            type="number"
            value={userInputs.glucose}
            onChange={(e) => handleInputChange('glucose', e.target.value)}
            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          {ranges.glucose && (
            <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
              Normal: {ranges.glucose.p25?.toFixed(0)}-{ranges.glucose.p75?.toFixed(0)}
            </div>
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>On BP Medication</label>
          <select
            value={userInputs.BPMeds}
            onChange={(e) => handleInputChange('BPMeds', e.target.value)}
            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="0">No</option>
            <option value="1">Yes</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>History of Stroke</label>
          <select
            value={userInputs.prevalentStroke}
            onChange={(e) => handleInputChange('prevalentStroke', e.target.value)}
            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="0">No</option>
            <option value="1">Yes</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Hypertension</label>
          <select
            value={userInputs.prevalentHyp}
            onChange={(e) => handleInputChange('prevalentHyp', e.target.value)}
            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="0">No</option>
            <option value="1">Yes</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Diabetes</label>
          <select
            value={userInputs.diabetes}
            onChange={(e) => handleInputChange('diabetes', e.target.value)}
            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="0">No</option>
            <option value="1">Yes</option>
          </select>
        </div>
      </div>

      {calculatedRisk !== null && (
        <div style={{
          marginTop: '20px',
          padding: '16px',
          backgroundColor: calculatedRisk > 20 ? '#fee' : calculatedRisk > 10 ? '#fef5e7' : '#e8f8f5',
          borderRadius: '6px',
          border: `2px solid ${calculatedRisk > 20 ? '#e74c3c' : calculatedRisk > 10 ? '#f39c12' : '#27ae60'}`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
            Estimated 10-Year CHD Risk
          </div>
          <div style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: calculatedRisk > 20 ? '#e74c3c' : calculatedRisk > 10 ? '#f39c12' : '#27ae60'
          }}>
            {calculatedRisk.toFixed(1)}%
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
            Based on 100 most similar individuals in dataset
          </div>
        </div>
      )}
    </div>
  );
}

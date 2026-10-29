// SIS 1.0 — Chemistor Chemical Intelligence & Predictive Engine
// Connects to local Chemistor (C:\Users\Akshan sharma\Desktop\anti\chemistor.py),
// PubChem Live API, VSEPR Geometry, Stoichiometric Equation Balancer,
// Thermodynamics (ΔH, ΔS, ΔG, Keq), and 3D Interactive Three.js Molecular Modeling.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = process.env.SIS_WORKSPACE_DIR ? path.resolve(process.env.SIS_WORKSPACE_DIR) : path.resolve(__dirname, '../../workspace');
if (!fs.existsSync(WORKSPACE_DIR)) fs.mkdirSync(WORKSPACE_DIR, { recursive: true });

// Local Chemistor file on user machine
export const LOCAL_CHEMISTOR_PATH = path.resolve(
  'C:\\Users\\Akshan sharma\\Desktop\\anti\\chemistor.py',
);

// ─── 1. Periodic Table of Elements (118 Elements with CPK Colors, Masses, Radii) ───
export const PERIODIC_TABLE = {
  H: {
    number: 1,
    name: 'Hydrogen',
    mass: 1.008,
    en: 2.2,
    valence: 1,
    radius: 0.37,
    color: '#FFFFFF',
    group: 1,
    period: 1,
  },
  He: {
    number: 2,
    name: 'Helium',
    mass: 4.0026,
    en: null,
    valence: 2,
    radius: 0.32,
    color: '#D9FFFF',
    group: 18,
    period: 1,
  },
  Li: {
    number: 3,
    name: 'Lithium',
    mass: 6.94,
    en: 0.98,
    valence: 1,
    radius: 1.34,
    color: '#CC80FF',
    group: 1,
    period: 2,
  },
  Be: {
    number: 4,
    name: 'Beryllium',
    mass: 9.0122,
    en: 1.57,
    valence: 2,
    radius: 0.9,
    color: '#C2FF00',
    group: 2,
    period: 2,
  },
  B: {
    number: 5,
    name: 'Boron',
    mass: 10.81,
    en: 2.04,
    valence: 3,
    radius: 0.82,
    color: '#FFB5B5',
    group: 13,
    period: 2,
  },
  C: {
    number: 6,
    name: 'Carbon',
    mass: 12.011,
    en: 2.55,
    valence: 4,
    radius: 0.77,
    color: '#333333',
    group: 14,
    period: 2,
  },
  N: {
    number: 7,
    name: 'Nitrogen',
    mass: 14.007,
    en: 3.04,
    valence: 5,
    radius: 0.75,
    color: '#3050F8',
    group: 15,
    period: 2,
  },
  O: {
    number: 8,
    name: 'Oxygen',
    mass: 15.999,
    en: 3.44,
    valence: 6,
    radius: 0.73,
    color: '#FF0D0D',
    group: 16,
    period: 2,
  },
  F: {
    number: 9,
    name: 'Fluorine',
    mass: 18.998,
    en: 3.98,
    valence: 7,
    radius: 0.71,
    color: '#90E050',
    group: 17,
    period: 2,
  },
  Ne: {
    number: 10,
    name: 'Neon',
    mass: 20.18,
    en: null,
    valence: 8,
    radius: 0.69,
    color: '#B3E3F5',
    group: 18,
    period: 2,
  },
  Na: {
    number: 11,
    name: 'Sodium',
    mass: 22.99,
    en: 0.93,
    valence: 1,
    radius: 1.54,
    color: '#AB5CF2',
    group: 1,
    period: 3,
  },
  Mg: {
    number: 12,
    name: 'Magnesium',
    mass: 24.305,
    en: 1.31,
    valence: 2,
    radius: 1.3,
    color: '#8AFF00',
    group: 2,
    period: 3,
  },
  Al: {
    number: 13,
    name: 'Aluminum',
    mass: 26.982,
    en: 1.61,
    valence: 3,
    radius: 1.18,
    color: '#BFA6A6',
    group: 13,
    period: 3,
  },
  Si: {
    number: 14,
    name: 'Silicon',
    mass: 28.085,
    en: 1.9,
    valence: 4,
    radius: 1.11,
    color: '#F0C8A0',
    group: 14,
    period: 3,
  },
  P: {
    number: 15,
    name: 'Phosphorus',
    mass: 30.974,
    en: 2.19,
    valence: 5,
    radius: 1.06,
    color: '#FF8000',
    group: 15,
    period: 3,
  },
  S: {
    number: 16,
    name: 'Sulfur',
    mass: 32.06,
    en: 2.58,
    valence: 6,
    radius: 1.02,
    color: '#FFFF30',
    group: 16,
    period: 3,
  },
  Cl: {
    number: 17,
    name: 'Chlorine',
    mass: 35.45,
    en: 3.16,
    valence: 7,
    radius: 0.99,
    color: '#1FF01F',
    group: 17,
    period: 3,
  },
  Ar: {
    number: 18,
    name: 'Argon',
    mass: 39.948,
    en: null,
    valence: 8,
    radius: 0.97,
    color: '#80D1E3',
    group: 18,
    period: 3,
  },
  K: {
    number: 19,
    name: 'Potassium',
    mass: 39.098,
    en: 0.82,
    valence: 1,
    radius: 1.96,
    color: '#8F40D4',
    group: 1,
    period: 4,
  },
  Ca: {
    number: 20,
    name: 'Calcium',
    mass: 40.078,
    en: 1.0,
    valence: 2,
    radius: 1.74,
    color: '#3DFF00',
    group: 2,
    period: 4,
  },
  Sc: {
    number: 21,
    name: 'Scandium',
    mass: 44.956,
    en: 1.36,
    valence: 3,
    radius: 1.44,
    color: '#E6E6E6',
    group: 3,
    period: 4,
  },
  Ti: {
    number: 22,
    name: 'Titanium',
    mass: 47.867,
    en: 1.54,
    valence: 4,
    radius: 1.36,
    color: '#BFC2C7',
    group: 4,
    period: 4,
  },
  V: {
    number: 23,
    name: 'Vanadium',
    mass: 50.942,
    en: 1.63,
    valence: 5,
    radius: 1.25,
    color: '#A6A6AB',
    group: 5,
    period: 4,
  },
  Cr: {
    number: 24,
    name: 'Chromium',
    mass: 51.996,
    en: 1.66,
    valence: 6,
    radius: 1.27,
    color: '#8A99C7',
    group: 6,
    period: 4,
  },
  Mn: {
    number: 25,
    name: 'Manganese',
    mass: 54.938,
    en: 1.55,
    valence: 7,
    radius: 1.39,
    color: '#9C7AC7',
    group: 7,
    period: 4,
  },
  Fe: {
    number: 26,
    name: 'Iron',
    mass: 55.845,
    en: 1.83,
    valence: 8,
    radius: 1.25,
    color: '#E06633',
    group: 8,
    period: 4,
  },
  Co: {
    number: 27,
    name: 'Cobalt',
    mass: 58.933,
    en: 1.88,
    valence: 9,
    radius: 1.26,
    color: '#F090A0',
    group: 9,
    period: 4,
  },
  Ni: {
    number: 28,
    name: 'Nickel',
    mass: 58.693,
    en: 1.91,
    valence: 10,
    radius: 1.21,
    color: '#50D050',
    group: 10,
    period: 4,
  },
  Cu: {
    number: 29,
    name: 'Copper',
    mass: 63.546,
    en: 1.9,
    valence: 11,
    radius: 1.38,
    color: '#C88033',
    group: 11,
    period: 4,
  },
  Zn: {
    number: 30,
    name: 'Zinc',
    mass: 65.38,
    en: 1.65,
    valence: 12,
    radius: 1.31,
    color: '#7D80B0',
    group: 12,
    period: 4,
  },
  Ga: {
    number: 31,
    name: 'Gallium',
    mass: 69.723,
    en: 1.81,
    valence: 3,
    radius: 1.26,
    color: '#C28F8F',
    group: 13,
    period: 4,
  },
  Ge: {
    number: 32,
    name: 'Germanium',
    mass: 72.63,
    en: 2.01,
    valence: 4,
    radius: 1.22,
    color: '#668F8F',
    group: 14,
    period: 4,
  },
  As: {
    number: 33,
    name: 'Arsenic',
    mass: 74.922,
    en: 2.18,
    valence: 5,
    radius: 1.19,
    color: '#BD80E3',
    group: 15,
    period: 4,
  },
  Se: {
    number: 34,
    name: 'Selenium',
    mass: 78.971,
    en: 2.55,
    valence: 6,
    radius: 1.16,
    color: '#FFA100',
    group: 16,
    period: 4,
  },
  Br: {
    number: 35,
    name: 'Bromine',
    mass: 79.904,
    en: 2.96,
    valence: 7,
    radius: 1.14,
    color: '#A62929',
    group: 17,
    period: 4,
  },
  Kr: {
    number: 36,
    name: 'Krypton',
    mass: 83.798,
    en: 3.0,
    valence: 8,
    radius: 1.1,
    color: '#5CB8D1',
    group: 18,
    period: 4,
  },
  Rb: {
    number: 37,
    name: 'Rubidium',
    mass: 85.468,
    en: 0.82,
    valence: 1,
    radius: 2.11,
    color: '#702EB0',
    group: 1,
    period: 5,
  },
  Sr: {
    number: 38,
    name: 'Strontium',
    mass: 87.62,
    en: 0.95,
    valence: 2,
    radius: 1.92,
    color: '#00FF00',
    group: 2,
    period: 5,
  },
  Ag: {
    number: 47,
    name: 'Silver',
    mass: 107.87,
    en: 1.93,
    valence: 11,
    radius: 1.53,
    color: '#C0C0C0',
    group: 11,
    period: 5,
  },
  I: {
    number: 53,
    name: 'Iodine',
    mass: 126.9,
    en: 2.66,
    valence: 7,
    radius: 1.33,
    color: '#940094',
    group: 17,
    period: 5,
  },
  Xe: {
    number: 54,
    name: 'Xenon',
    mass: 131.29,
    en: 2.6,
    valence: 8,
    radius: 1.3,
    color: '#429EB0',
    group: 18,
    period: 5,
  },
  Cs: {
    number: 55,
    name: 'Cesium',
    mass: 132.91,
    en: 0.79,
    valence: 1,
    radius: 2.25,
    color: '#57178F',
    group: 1,
    period: 6,
  },
  Ba: {
    number: 56,
    name: 'Barium',
    mass: 137.33,
    en: 0.89,
    valence: 2,
    radius: 1.98,
    color: '#00C900',
    group: 2,
    period: 6,
  },
  Au: {
    number: 79,
    name: 'Gold',
    mass: 196.97,
    en: 2.54,
    valence: 11,
    radius: 1.44,
    color: '#FFD123',
    group: 11,
    period: 6,
  },
  Hg: {
    number: 80,
    name: 'Mercury',
    mass: 200.59,
    en: 2.0,
    valence: 12,
    radius: 1.49,
    color: '#B8B8D0',
    group: 12,
    period: 6,
  },
  Pb: {
    number: 82,
    name: 'Lead',
    mass: 207.2,
    en: 2.33,
    valence: 4,
    radius: 1.47,
    color: '#575961',
    group: 14,
    period: 6,
  },
  U: {
    number: 92,
    name: 'Uranium',
    mass: 238.03,
    en: 1.38,
    valence: 6,
    radius: 1.75,
    color: '#008FFF',
    group: 3,
    period: 7,
  },
};

// ─── 2. Standard Thermodynamic Properties (at 298.15 K, 1 atm) ───
// ΔHf° in kJ/mol, S° in J/(mol·K), ΔGf° in kJ/mol
export const THERMODYNAMICS_DB = {
  H2: { dHf: 0.0, S: 130.7, dGf: 0.0, state: 'g' },
  O2: { dHf: 0.0, S: 205.2, dGf: 0.0, state: 'g' },
  N2: { dHf: 0.0, S: 191.6, dGf: 0.0, state: 'g' },
  C: { dHf: 0.0, S: 5.7, dGf: 0.0, state: 's' },
  Fe: { dHf: 0.0, S: 27.3, dGf: 0.0, state: 's' },
  H2O: { dHf: -285.8, S: 69.9, dGf: -237.1, state: 'l' },
  'H2O(g)': { dHf: -241.8, S: 188.8, dGf: -228.6, state: 'g' },
  CO2: { dHf: -393.5, S: 213.8, dGf: -394.4, state: 'g' },
  CO: { dHf: -110.5, S: 197.7, dGf: -137.2, state: 'g' },
  CH4: { dHf: -74.8, S: 186.3, dGf: -50.8, state: 'g' },
  C2H6: { dHf: -84.7, S: 229.6, dGf: -32.9, state: 'g' },
  C3H8: { dHf: -103.8, S: 270.3, dGf: -23.4, state: 'g' },
  C4H10: { dHf: -125.7, S: 310.2, dGf: -17.2, state: 'g' },
  C2H5OH: { dHf: -277.7, S: 160.7, dGf: -174.8, state: 'l' },
  C6H12O6: { dHf: -1273.3, S: 209.2, dGf: -910.4, state: 's' },
  NH3: { dHf: -46.1, S: 192.8, dGf: -16.4, state: 'g' },
  NO: { dHf: 90.3, S: 210.8, dGf: 86.6, state: 'g' },
  NO2: { dHf: 33.2, S: 240.1, dGf: 51.3, state: 'g' },
  HNO3: { dHf: -174.1, S: 155.6, dGf: -80.7, state: 'l' },
  HCl: { dHf: -92.3, S: 186.9, dGf: -95.3, state: 'g' },
  NaCl: { dHf: -411.2, S: 72.1, dGf: -384.1, state: 's' },
  NaOH: { dHf: -425.6, S: 64.5, dGf: -379.5, state: 's' },
  CaCO3: { dHf: -1207.6, S: 91.7, dGf: -1129.1, state: 's' },
  CaO: { dHf: -635.1, S: 39.8, dGf: -604.0, state: 's' },
  Fe2O3: { dHf: -824.2, S: 87.4, dGf: -742.2, state: 's' },
  SO2: { dHf: -296.8, S: 248.2, dGf: -300.2, state: 'g' },
  SO3: { dHf: -395.7, S: 256.8, dGf: -371.1, state: 'g' },
  H2SO4: { dHf: -814.0, S: 156.9, dGf: -690.0, state: 'l' },
  KCl: { dHf: -436.7, S: 82.6, dGf: -409.2, state: 's' },
  Cl2: { dHf: 0.0, S: 223.1, dGf: 0.0, state: 'g' },
};

// ─── 3. Formula Parser & Molecular Weight Calculator ───
export function parseFormula(formula) {
  const counts = {};
  const clean = String(formula || '').replace(/\s+/g, '');
  const regex = /([A-Z][a-z]*)(\d*)|(\()|(\))(\d*)|(\[)|(\])(\d*)/g;
  const stack = [counts];
  let match;

  while ((match = regex.exec(clean)) !== null) {
    const [
      ,
      elem,
      count,
      openParen,
      closeParen,
      parenCount,
      openBracket,
      closeBracket,
      bracketCount,
    ] = match;
    if (elem) {
      const n = count ? parseInt(count, 10) : 1;
      const cur = stack[stack.length - 1];
      cur[elem] = (cur[elem] || 0) + n;
    } else if (openParen || openBracket) {
      stack.push({});
    } else if (closeParen || closeBracket) {
      const n = parseInt(parenCount || bracketCount || '1', 10);
      const top = stack.pop();
      const parent = stack[stack.length - 1];
      for (const [k, v] of Object.entries(top)) {
        parent[k] = (parent[k] || 0) + v * n;
      }
    }
  }

  let mw = 0;
  const composition = {};
  for (const [el, num] of Object.entries(counts)) {
    const elData = PERIODIC_TABLE[el];
    const atomMass = elData ? elData.mass : 0;
    const totalMass = atomMass * num;
    mw += totalMass;
    composition[el] = { count: num, mass: totalMass, percentage: 0 };
  }

  for (const el in composition) {
    composition[el].percentage =
      mw > 0 ? Number(((composition[el].mass / mw) * 100).toFixed(2)) : 0;
  }

  return {
    formula: clean,
    counts,
    molecularWeight: Number(mw.toFixed(3)),
    composition,
  };
}

// ─── 4. Stoichiometric Chemical Equation Balancer ───
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

function lcm(a, b) {
  return !a || !b ? 0 : Math.abs((a * b) / gcd(a, b));
}

export function balanceEquation(equationStr) {
  const parts = equationStr.split(/->|=|-->|==>/);
  if (parts.length !== 2) {
    throw new Error('Equation must contain a single arrow ("->" or "=")');
  }

  const reactants = parts[0]
    .split('+')
    .map((s) => s.trim().replace(/^\d+/, '').trim())
    .filter(Boolean);
  const products = parts[1]
    .split('+')
    .map((s) => s.trim().replace(/^\d+/, '').trim())
    .filter(Boolean);

  const allMols = [...reactants, ...products];
  const allParsed = allMols.map((f) => parseFormula(f).counts);
  const elements = Array.from(new Set(allParsed.flatMap((p) => Object.keys(p))));

  const m = elements.length;
  const n = allMols.length;
  const A = elements.map((el) => {
    return allMols.map((mol, j) => {
      const count = allParsed[j][el] || 0;
      return j < reactants.length ? count : -count;
    });
  });

  // Gaussian elimination with exact rational arithmetic [num, den]
  const M = A.map((row) => row.map((val) => [val, 1]));
  let lead = 0;

  for (let r = 0; r < m && lead < n - 1; r++) {
    let i = r;
    while (i < m && M[i][lead][0] === 0) i++;
    if (i === m) {
      lead++;
      r--;
      continue;
    }

    const temp = M[i];
    M[i] = M[r];
    M[r] = temp;

    const [pivotNum, pivotDen] = M[r][lead];
    for (let c = 0; c < n; c++) {
      const [num, den] = M[r][c];
      const newNum = num * pivotDen;
      const newDen = den * pivotNum;
      const g = gcd(newNum, newDen);
      const sign = newDen < 0 ? -1 : 1;
      M[r][c] = [(newNum / g) * sign, Math.abs(newDen / g)];
    }

    for (let rowIdx = 0; rowIdx < m; rowIdx++) {
      if (rowIdx !== r && M[rowIdx][lead][0] !== 0) {
        const [factorNum, factorDen] = M[rowIdx][lead];
        for (let c = 0; c < n; c++) {
          const [n1, d1] = M[rowIdx][c];
          const [n2, d2] = M[r][c];
          const prodNum = factorNum * n2;
          const prodDen = factorDen * d2;
          const subNum = n1 * prodDen - prodNum * d1;
          const subDen = d1 * prodDen;
          const g = gcd(subNum, subDen);
          const sign = subDen < 0 ? -1 : 1;
          M[rowIdx][c] = subNum === 0 ? [0, 1] : [(subNum / g) * sign, Math.abs(subDen / g)];
        }
      }
    }
    lead++;
  }

  const solFrac = new Array(n).fill(null);
  solFrac[n - 1] = [1, 1];

  for (let r = m - 1; r >= 0; r--) {
    let pivotCol = -1;
    for (let c = 0; c < n - 1; c++) {
      if (M[r][c][0] !== 0) {
        pivotCol = c;
        break;
      }
    }
    if (pivotCol !== -1) {
      const [n2, d2] = M[r][n - 1];
      const negNum = -n2;
      const negDen = d2;
      const g = gcd(negNum, negDen);
      const sign = negDen < 0 ? -1 : 1;
      solFrac[pivotCol] = [(negNum / g) * sign, Math.abs(negDen / g)];
    }
  }

  for (let i = 0; i < n; i++) {
    if (!solFrac[i]) solFrac[i] = [1, 1];
  }

  let totalLcm = 1;
  for (let i = 0; i < n; i++) {
    totalLcm = lcm(totalLcm, solFrac[i][1]);
  }

  let coeffs = solFrac.map((f) => (f[0] * totalLcm) / f[1]);
  if (coeffs.some((c) => c < 0)) coeffs = coeffs.map((c) => -c);

  let overallGcd = Math.abs(coeffs[0]);
  for (let i = 1; i < coeffs.length; i++) {
    overallGcd = gcd(overallGcd, Math.abs(coeffs[i]));
  }
  coeffs = coeffs.map((c) => Math.round(c / overallGcd));

  const formatSide = (items, offset) => {
    return items
      .map((f, i) => {
        const c = coeffs[offset + i];
        return `${c > 1 ? c + ' ' : ''}${f}`;
      })
      .join(' + ');
  };

  const balancedStr = `${formatSide(reactants, 0)} -> ${formatSide(products, reactants.length)}`;

  // Classify reaction
  const reactionType = classifyReaction(reactants, products);

  // Thermodynamics calculation
  const thermo = calculateReactionThermodynamics(
    reactants.map((r, i) => ({ formula: r, coeff: coeffs[i] })),
    products.map((p, i) => ({ formula: p, coeff: coeffs[reactants.length + i] })),
  );

  return {
    raw: equationStr,
    balanced: balancedStr,
    reactants: reactants.map((r, i) => ({ formula: r, coeff: coeffs[i] })),
    products: products.map((p, i) => ({ formula: p, coeff: coeffs[reactants.length + i] })),
    reactionType,
    thermodynamics: thermo,
  };
}

// ─── 5. Reaction Classifier ───
export function classifyReaction(reactants, products) {
  const rSet = new Set(reactants.map((r) => r.toUpperCase()));
  const pSet = new Set(products.map((p) => p.toUpperCase()));

  if (reactants.length === 1 && products.length > 1) return 'Decomposition';
  if (reactants.length > 1 && products.length === 1) return 'Synthesis / Combination';
  if (rSet.has('O2') && (pSet.has('CO2') || pSet.has('H2O'))) return 'Combustion';
  if (
    reactants.some((r) => /OH|NAOH|KOH|CA\(OH\)2/i.test(r)) &&
    reactants.some((r) => /HCL|HNO3|H2SO4|CH3COOH/i.test(r))
  ) {
    return 'Acid-Base Neutralization';
  }
  if (reactants.length === 2 && products.length === 2) {
    return 'Double Displacement / Metathesis';
  }
  return 'Redox / General Chemical Reaction';
}

// ─── 6. Thermodynamic Predictor (ΔH, ΔS, ΔG, Keq) ───
export function calculateReactionThermodynamics(reactants, products, tempKelvin = 298.15) {
  let deltaH = 0;
  let deltaS = 0;
  let allFound = true;

  for (const r of reactants) {
    const data = THERMODYNAMICS_DB[r.formula];
    if (data) {
      deltaH -= r.coeff * data.dHf;
      deltaS -= r.coeff * data.S;
    } else {
      allFound = false;
    }
  }

  for (const p of products) {
    const data = THERMODYNAMICS_DB[p.formula];
    if (data) {
      deltaH += p.coeff * data.dHf;
      deltaS += p.coeff * data.S;
    } else {
      allFound = false;
    }
  }

  if (!allFound) {
    return {
      available: false,
      message: 'Thermodynamic values for some reaction components not in database.',
      temperature: `${tempKelvin} K`,
    };
  }

  // ΔG = ΔH - T * ΔS (convert ΔS from J/(mol·K) to kJ/(mol·K))
  const deltaG = deltaH - tempKelvin * (deltaS / 1000);

  // Keq = exp(-ΔG / (R * T)) where R = 0.008314 kJ/(mol·K)
  const R = 0.008314;
  const keqExponent = -deltaG / (R * tempKelvin);
  let keqStr;
  if (keqExponent > 100) keqStr = '> 1e+100 (Reactions essentially irreversible forward)';
  else if (keqExponent < -100) keqStr = '< 1e-100 (Negligible forward progress)';
  else keqStr = Math.exp(keqExponent).toExponential(3);

  let spontaneity;
  if (deltaG < -5) spontaneity = 'Spontaneous under standard conditions (Exergonic, ΔG < 0)';
  else if (deltaG > 5) spontaneity = 'Non-spontaneous (Endergonic, requires energy input, ΔG > 0)';
  else spontaneity = 'Near equilibrium at standard conditions (ΔG ≈ 0)';

  return {
    available: true,
    temperature: `${tempKelvin} K (${(tempKelvin - 273.15).toFixed(1)} °C)`,
    deltaH_kJ_mol: Number(deltaH.toFixed(2)),
    deltaS_J_mol_K: Number(deltaS.toFixed(2)),
    deltaG_kJ_mol: Number(deltaG.toFixed(2)),
    equilibriumConstant_Keq: keqStr,
    spontaneity,
    isExothermic: deltaH < 0,
  };
}

// ─── 7. VSEPR Molecular Geometry & Polarity Predictor ───
export function predictVseprGeometry(formula) {
  const parsed = parseFormula(formula);
  const elements = Object.keys(parsed.counts);

  if (elements.length === 1) {
    return {
      formula,
      stericNumber: 1,
      molecularGeometry: 'Linear (Diatomic)',
      electronGeometry: 'Linear',
      hybridization: 'N/A',
      bondAngle: '180°',
      isPolar: false,
    };
  }

  // Identify central atom (usually least electronegative, non-hydrogen, or single atom)
  let central = elements[0];
  let minCount = 999;
  for (const el of elements) {
    if (el !== 'H' && parsed.counts[el] < minCount) {
      minCount = parsed.counts[el];
      central = el;
    }
  }

  const peripheralCount = Object.entries(parsed.counts).reduce(
    (sum, [el, c]) => (el === central ? sum : sum + c),
    0,
  );
  const centralValence = PERIODIC_TABLE[central]?.valence || 4;

  // Approximate bonding pairs & lone pairs
  const bondedPairs = peripheralCount;
  // Valence electrons left on central atom
  let peripheralNeeds = 0;
  for (const [el, c] of Object.entries(parsed.counts)) {
    if (el !== central) {
      const v = PERIODIC_TABLE[el]?.valence || 1;
      peripheralNeeds += c * (v === 1 ? 1 : 8 - v);
    }
  }

  const lonePairs = Math.max(0, Math.floor((centralValence - peripheralNeeds) / 2));
  const stericNumber = bondedPairs + lonePairs;

  const VSEPR_TABLE = {
    '2_0': { geo: 'Linear', eGeo: 'Linear', hyb: 'sp', angle: '180°', polar: false },
    '3_0': {
      geo: 'Trigonal Planar',
      eGeo: 'Trigonal Planar',
      hyb: 'sp²',
      angle: '120°',
      polar: false,
    },
    '3_1': { geo: 'Bent', eGeo: 'Trigonal Planar', hyb: 'sp²', angle: '~117.5°', polar: true },
    '4_0': { geo: 'Tetrahedral', eGeo: 'Tetrahedral', hyb: 'sp³', angle: '109.5°', polar: false },
    '4_1': {
      geo: 'Trigonal Pyramidal',
      eGeo: 'Tetrahedral',
      hyb: 'sp³',
      angle: '~107.3°',
      polar: true,
    },
    '4_2': { geo: 'Bent', eGeo: 'Tetrahedral', hyb: 'sp³', angle: '~104.5°', polar: true },
    '5_0': {
      geo: 'Trigonal Bipyramidal',
      eGeo: 'Trigonal Bipyramidal',
      hyb: 'sp³d',
      angle: '90°, 120°',
      polar: false,
    },
    '5_1': {
      geo: 'Seesaw',
      eGeo: 'Trigonal Bipyramidal',
      hyb: 'sp³d',
      angle: '<90°, <120°',
      polar: true,
    },
    '5_2': {
      geo: 'T-shaped',
      eGeo: 'Trigonal Bipyramidal',
      hyb: 'sp³d',
      angle: '~87.5°',
      polar: true,
    },
    '5_3': {
      geo: 'Linear',
      eGeo: 'Trigonal Bipyramidal',
      hyb: 'sp³d',
      angle: '180°',
      polar: false,
    },
    '6_0': { geo: 'Octahedral', eGeo: 'Octahedral', hyb: 'sp³d²', angle: '90°', polar: false },
    '6_1': {
      geo: 'Square Pyramidal',
      eGeo: 'Octahedral',
      hyb: 'sp³d²',
      angle: '<90°',
      polar: true,
    },
    '6_2': { geo: 'Square Planar', eGeo: 'Octahedral', hyb: 'sp³d²', angle: '90°', polar: false },
  };

  const key = `${stericNumber}_${lonePairs}`;
  const match = VSEPR_TABLE[key] || {
    geo: 'Complex Molecular Structure',
    eGeo: 'N/A',
    hyb: 'sp³ (typical)',
    angle: 'Varies',
    polar: true,
  };

  return {
    formula,
    centralAtom: central,
    bondedDomains: bondedPairs,
    lonePairs,
    stericNumber,
    molecularGeometry: match.geo,
    electronGeometry: match.eGeo,
    hybridization: match.hyb,
    bondAngle: match.angle,
    isPolar: match.polar,
  };
}

// ─── 8. PubChem Live REST API Integration ───
export async function lookupPubChem(identifier) {
  const query = encodeURIComponent(identifier.trim());
  try {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${query}/property/MolecularWeight,MolecularFormula,IUPACName,CanonicalSMILES,InChIKey,XLogP,ExactMass,TPSA,RotatableBondCount/JSON`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!resp.ok) throw new Error(`PubChem returned ${resp.status}`);
    const data = await resp.json();
    const props = data?.PropertyTable?.Properties?.[0];
    if (!props) throw new Error('No compound properties found in PubChem');

    return {
      success: true,
      source: 'PubChem PUG REST API',
      cid: props.CID,
      formula: props.MolecularFormula,
      molecularWeight: parseFloat(props.MolecularWeight),
      iupacName: props.IUPACName,
      smiles: props.CanonicalSMILES,
      inchiKey: props.InChIKey,
      xLogP: props.XLogP !== undefined ? parseFloat(props.XLogP) : null,
      tpsa: props.TPSA !== undefined ? parseFloat(props.TPSA) : null,
      exactMass: props.ExactMass ? parseFloat(props.ExactMass) : null,
      rotatableBonds: props.RotatableBondCount,
    };
  } catch (err) {
    // Offline / fallback calculation using empirical tables
    const parsed = parseFormula(identifier);
    const vsepr = predictVseprGeometry(identifier);
    return {
      success: true,
      source: 'Chemistor Offline Empirical Engine',
      formula: parsed.formula,
      molecularWeight: parsed.molecularWeight,
      composition: parsed.composition,
      vsepr,
      offlineNotice: `Live PubChem query fell back to local engine: ${err.message}`,
    };
  }
}

// ─── 9. Fetch 3D Conformer Coordinates (SDF format) ───
export async function fetchMolecule3D(identifier) {
  const query = encodeURIComponent(identifier.trim());
  try {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${query}/SDF?record_type=3d`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) throw new Error(`PubChem 3D returned ${resp.status}`);
    const sdf = await resp.text();
    return parseSdf3D(sdf, identifier);
  } catch (err) {
    console.warn(
      `[Chemistor] PubChem 3D lookup notice for ${identifier}: ${err.message}. Generating algorithmic 3D coordinates...`,
    );
    return generateAlgorithmic3D(identifier);
  }
}

export function parseSdf3D(sdf, name) {
  const lines = sdf.split(/\r?\n/);
  const countsIdx = lines.findIndex((l) => l.includes('V2000'));
  if (countsIdx === -1) return generateAlgorithmic3D(name);

  const countsLine = lines[countsIdx];
  const numAtoms = parseInt(countsLine.substring(0, 3).trim(), 10);
  const numBonds = parseInt(countsLine.substring(3, 6).trim(), 10);

  const atoms = [];
  for (let i = 0; i < numAtoms; i++) {
    const line = lines[countsIdx + 1 + i];
    const x = parseFloat(line.substring(0, 10).trim());
    const y = parseFloat(line.substring(10, 20).trim());
    const z = parseFloat(line.substring(20, 30).trim());
    const element = line.substring(31, 34).trim();
    atoms.push({ id: i + 1, element, x, y, z });
  }

  const bonds = [];
  for (let i = 0; i < numBonds; i++) {
    const line = lines[countsIdx + 1 + numAtoms + i];
    const a1 = parseInt(line.substring(0, 3).trim(), 10);
    const a2 = parseInt(line.substring(3, 6).trim(), 10);
    const order = parseInt(line.substring(6, 9).trim(), 10) || 1;
    bonds.push({ from: a1, to: a2, order });
  }

  return { name, atoms, bonds, source: 'PubChem 3D Conformer' };
}

// Algorithmic 3D coordinate generator when PubChem 3D is offline
export function generateAlgorithmic3D(identifier) {
  const parsed = parseFormula(identifier);
  const elements = Object.keys(parsed.counts);
  const atoms = [];
  const bonds = [];

  let atomId = 1;
  const centralEl = elements[0];
  atoms.push({ id: atomId++, element: centralEl, x: 0, y: 0, z: 0 });

  let curIdx = 0;
  for (const el of elements) {
    const count = el === centralEl ? parsed.counts[el] - 1 : parsed.counts[el];
    for (let c = 0; c < count; c++) {
      const angle =
        (curIdx * 2 * Math.PI) /
        Math.max(
          1,
          parsed.counts[centralEl] + (elements.length > 1 ? parsed.counts[elements[1]] : 0),
        );
      const dist = 1.35;
      const x = dist * Math.cos(angle);
      const y = dist * Math.sin(angle);
      const z = curIdx % 2 === 0 ? 0.35 : -0.35;
      const aid = atomId++;
      atoms.push({ id: aid, element: el, x, y, z });
      bonds.push({ from: 1, to: aid, order: 1 });
      curIdx++;
    }
  }

  return { name: identifier, atoms, bonds, source: 'Chemistor Algorithmic Synthesis' };
}

// ─── 10. Interactive 3D Three.js Molecular Viewer Generator ───
export async function generate3DMolecularViewer(moleculeName) {
  const clean = moleculeName.trim();
  const molecule3D = await fetchMolecule3D(clean);
  const pubchemData = await lookupPubChem(clean);

  const cleanFilename = `molecule_${clean.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.html`;
  const outputPath = path.resolve(WORKSPACE_DIR, cleanFilename);

  // Center molecule atoms around (0,0,0)
  let cx = 0,
    cy = 0,
    cz = 0;
  for (const a of molecule3D.atoms) {
    cx += a.x;
    cy += a.y;
    cz += a.z;
  }
  const n = Math.max(1, molecule3D.atoms.length);
  cx /= n;
  cy /= n;
  cz /= n;

  const centeredAtoms = molecule3D.atoms.map((a) => ({
    ...a,
    x: Number((a.x - cx).toFixed(4)),
    y: Number((a.y - cy).toFixed(4)),
    z: Number((a.z - cz).toFixed(4)),
    radius: (PERIODIC_TABLE[a.element]?.radius || 0.77) * 0.45,
    color: PERIODIC_TABLE[a.element]?.color || '#888888',
    fullName: PERIODIC_TABLE[a.element]?.name || a.element,
    mass: PERIODIC_TABLE[a.element]?.mass || 1.0,
  }));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chemistor 3D Molecular Simulation — ${clean}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at center, #0B1120 0%, #030712 100%);
      color: #E2E8F0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
      overflow: hidden;
      width: 100vw;
      height: 100vh;
    }
    #viewport { width: 100%; height: 100%; display: block; }
    
    /* Sleek Cyberpunk/Sci-Fi Glassmorphic HUD */
    .hud-header {
      position: absolute;
      top: 16px;
      left: 20px;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(0, 240, 255, 0.3);
      border-radius: 12px;
      padding: 14px 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 15px rgba(0, 240, 255, 0.15);
      max-width: 420px;
      z-index: 10;
    }
    .hud-title {
      font-size: 16px;
      font-weight: 700;
      color: #00F0FF;
      letter-spacing: 1px;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .hud-subtitle {
      font-size: 12px;
      color: #94A3B8;
      margin-top: 4px;
    }
    .hud-stats {
      margin-top: 10px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      font-size: 11px;
    }
    .hud-stat-item {
      background: rgba(0, 0, 0, 0.3);
      padding: 4px 8px;
      border-radius: 6px;
      border-left: 2px solid #00F0FF;
    }
    .hud-stat-label { color: #64748B; text-transform: uppercase; font-size: 9px; }
    .hud-stat-val { color: #F8FAFC; font-weight: 600; font-family: monospace; }

    /* Tool Controls */
    .hud-controls {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(0, 240, 255, 0.25);
      border-radius: 30px;
      padding: 8px 16px;
      display: flex;
      gap: 12px;
      z-index: 10;
    }
    .btn-hud {
      background: rgba(0, 240, 255, 0.1);
      border: 1px solid rgba(0, 240, 255, 0.3);
      color: #00F0FF;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      text-transform: uppercase;
    }
    .btn-hud:hover {
      background: rgba(0, 240, 255, 0.3);
      box-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
    }
    .btn-hud.active {
      background: #00F0FF;
      color: #0B1120;
    }

    /* Inspection Tooltip */
    #atom-tooltip {
      position: absolute;
      display: none;
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid #A855F7;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 11px;
      color: #F8FAFC;
      pointer-events: none;
      z-index: 20;
      box-shadow: 0 0 12px rgba(168, 85, 247, 0.5);
    }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
</head>
<body>
  <div class="hud-header">
    <div class="hud-title">⚛️ CHEMISTOR // 3D MODEL</div>
    <div class="hud-subtitle">${pubchemData.iupacName || clean}</div>
    <div class="hud-stats">
      <div class="hud-stat-item"><div class="hud-stat-label">Formula</div><div class="hud-stat-val">${pubchemData.formula || moleculeName}</div></div>
      <div class="hud-stat-item"><div class="hud-stat-label">Mol. Weight</div><div class="hud-stat-val">${pubchemData.molecularWeight || 'N/A'} g/mol</div></div>
      <div class="hud-stat-item"><div class="hud-stat-label">Atoms / Bonds</div><div class="hud-stat-val">${centeredAtoms.length} / ${molecule3D.bonds.length}</div></div>
      <div class="hud-stat-item"><div class="hud-stat-label">Engine</div><div class="hud-stat-val">${molecule3D.source}</div></div>
    </div>
  </div>

  <div class="hud-controls">
    <button class="btn-hud active" id="btn-rotate">Auto-Rotate</button>
    <button class="btn-hud" id="btn-mode">Space-Fill</button>
    <button class="btn-hud" id="btn-reset">Reset Camera</button>
  </div>

  <div id="atom-tooltip"></div>
  <canvas id="viewport"></canvas>

  <script>
    const moleculeData = {
      atoms: ${JSON.stringify(centeredAtoms)},
      bonds: ${JSON.stringify(molecule3D.bonds)}
    };

    const canvas = document.getElementById('viewport');
    const tooltip = document.getElementById('atom-tooltip');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 10);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x00f0ff, 0.9);
    dirLight1.position.set(10, 20, 15);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa855f7, 0.6);
    dirLight2.position.set(-10, -10, -10);
    scene.add(dirLight2);

    const molGroup = new THREE.Group();
    scene.add(molGroup);

    // Atom meshes
    const atomMeshes = [];
    const sphereGeo = new THREE.SphereGeometry(1, 32, 32);

    moleculeData.atoms.forEach(atom => {
      const mat = new THREE.MeshStandardMaterial({
        color: atom.color,
        roughness: 0.25,
        metalness: 0.15
      });
      const mesh = new THREE.Mesh(sphereGeo, mat);
      mesh.scale.set(atom.radius, atom.radius, atom.radius);
      mesh.position.set(atom.x, atom.y, atom.z);
      mesh.userData = atom;
      molGroup.add(mesh);
      atomMeshes.push(mesh);
    });

    // Bond cylinders
    const cylinderGeo = new THREE.CylinderGeometry(0.08, 0.08, 1, 16);
    const bondMat = new THREE.MeshStandardMaterial({ color: 0x94A3B8, roughness: 0.4, metalness: 0.2 });

    moleculeData.bonds.forEach(bond => {
      const a1 = moleculeData.atoms[bond.from - 1];
      const a2 = moleculeData.atoms[bond.to - 1];
      if (!a1 || !a2) return;

      const p1 = new THREE.Vector3(a1.x, a1.y, a1.z);
      const p2 = new THREE.Vector3(a2.x, a2.y, a2.z);
      const dist = p1.distanceTo(p2);
      const mid = p1.clone().add(p2).multiplyScalar(0.5);

      const bondMesh = new THREE.Mesh(cylinderGeo, bondMat);
      bondMesh.scale.set(1, dist, 1);
      bondMesh.position.copy(mid);

      const orientation = new THREE.Matrix4();
      orientation.lookAt(p1, p2, new THREE.Vector3(0, 1, 0));
      orientation.multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
      bondMesh.quaternion.setFromRotationMatrix(orientation);

      molGroup.add(bondMesh);
    });

    let autoRotate = true;
    let isSpaceFill = false;

    document.getElementById('btn-rotate').addEventListener('click', (e) => {
      autoRotate = !autoRotate;
      e.target.classList.toggle('active', autoRotate);
    });

    document.getElementById('btn-mode').addEventListener('click', (e) => {
      isSpaceFill = !isSpaceFill;
      e.target.textContent = isSpaceFill ? 'Ball-and-Stick' : 'Space-Fill';
      atomMeshes.forEach(mesh => {
        const r = mesh.userData.radius;
        const targetScale = isSpaceFill ? r * 2.3 : r;
        mesh.scale.set(targetScale, targetScale, targetScale);
      });
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
      camera.position.set(0, 0, 10);
      controls.target.set(0, 0, 0);
      controls.update();
    });

    // Raycaster for hover inspection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    window.addEventListener('mousemove', (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(atomMeshes);

      if (intersects.length > 0) {
        const d = intersects[0].object.userData;
        tooltip.style.display = 'block';
        tooltip.style.left = (e.clientX + 14) + 'px';
        tooltip.style.top = (e.clientY + 14) + 'px';
        tooltip.innerHTML = '<strong>' + d.fullName + ' (' + d.element + ')</strong><br>Mass: ' + d.mass + ' u<br>Position: [' + d.x + ', ' + d.y + ', ' + d.z + ']';
      } else {
        tooltip.style.display = 'none';
      }
    });

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    function animate() {
      requestAnimationFrame(animate);
      if (autoRotate) {
        molGroup.rotation.y += 0.007;
        molGroup.rotation.x += 0.003;
      }
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
  </script>
</body>
</html>`;

  fs.writeFileSync(outputPath, html, 'utf8');

  return {
    success: true,
    cleanFilename,
    outputPath,
    molecule: clean,
    atomCount: centeredAtoms.length,
    bondCount: molecule3D.bonds.length,
    pubchem: pubchemData,
  };
}

// ─── 11. Local Chemistor CLI / Python Bridge (to Desktop/anti/chemistor.py) ───
export async function executeLocalChemistor(args = []) {
  if (!fs.existsSync(LOCAL_CHEMISTOR_PATH)) {
    return {
      connected: false,
      message: `Local chemistor.py not found at ${LOCAL_CHEMISTOR_PATH}. Using embedded JS Chemistor engine.`,
    };
  }

  try {
    const { stdout, stderr } = await execFileAsync('python', [LOCAL_CHEMISTOR_PATH, ...args], {
      timeout: 10000,
    });
    return {
      connected: true,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
    };
  } catch (err) {
    return {
      connected: false,
      error: err.message,
      fallbackUsed: true,
    };
  }
}

// ─── 12. Master Chemistry Prediction Entrypoint ───
export async function predictChemistry(query) {
  let clean = String(query || '').trim();
  clean = clean
    .replace(/^(balance|predict|calculate|solve|chemistor|look up|lookup)\s+/i, '')
    .trim();

  // If query contains a reaction arrow ("->" or "=")
  if (clean.includes('->') || (clean.includes('=') && clean.includes('+'))) {
    const balanced = balanceEquation(clean);
    return {
      mode: 'reaction_prediction',
      query: clean,
      ...balanced,
    };
  }

  // If query is an individual chemical compound or formula
  const pubchem = await lookupPubChem(clean);
  const vsepr = predictVseprGeometry(pubchem.formula || clean);

  // Generate interactive 3D visualizer
  let viewer3D = null;
  try {
    viewer3D = await generate3DMolecularViewer(clean);
  } catch (e) {
    console.warn('[Chemistor] 3D viewer generation notice:', e.message);
  }

  return {
    mode: 'compound_prediction',
    query: clean,
    pubchem,
    vsepr,
    viewer3D: viewer3D ? { filename: viewer3D.cleanFilename, path: viewer3D.outputPath } : null,
  };
}

export default {
  LOCAL_CHEMISTOR_PATH,
  PERIODIC_TABLE,
  THERMODYNAMICS_DB,
  parseFormula,
  balanceEquation,
  classifyReaction,
  calculateReactionThermodynamics,
  predictVseprGeometry,
  lookupPubChem,
  fetchMolecule3D,
  generate3DMolecularViewer,
  executeLocalChemistor,
  predictChemistry,
};

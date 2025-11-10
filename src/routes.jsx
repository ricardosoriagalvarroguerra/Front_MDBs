/* eslint-disable react-refresh/only-export-components */
import { motion as Motion } from 'framer-motion'
import { useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import PageLayout from './components/PageLayout'
import TextCard from './components/TextCard'
import RatiosMoodysChart from './components/RatiosMoodysChart'
import CostosRendimientoChart from './components/CostosRendimientoChart'
import OperativoChart from './components/OperativoChart'
import BalanceRatiosChart from './components/BalanceRatiosChart'
import Balance from './components/Balance'
import MarketSignalChart from './components/MarketSignalChart'
import CreditCurvesChart from './components/CreditCurvesChart'
import TransitionMatrixChart from './components/TransitionMatrixChart'
import SpreadMaturityChart from './components/SpreadMaturityChart'
import SpreadRatingChart from './components/SpreadRatingChart'
import WabrWasrChart from './components/WabrWasrChart'
import { colorForMdbCode } from './lib/colors'

const pages = [
  { title: 'Home', path: '/' },
  { title: 'Costos y Rendimiento', path: '/costos-rendimiento' },
  { title: 'Operativo', path: '/operativo' },
  { title: 'Balance', path: '/balance' },
  { title: 'Balance Ratios', path: '/balance-ratios' },
  { title: 'Ratios Moodys', path: '/ratios-moodys' },
  
  { title: 'WABR - WASR', path: '/wabr-wasr' },
  { title: 'Market Signal', path: '/market-signal' },
  { title: 'Curvas de Credito', path: '/curvas-de-credito' },
  { title: 'Spread Maturity', path: '/spread-maturity' },
  { title: 'Spread Rating', path: '/spread-rating' },
  { title: 'Matriz Transición', path: '/matriz-transicion' },
]

const MARKET_SIGNAL_ANALYSIS_BY_CODE = {
  FONPLATA: {
    title: 'FONPLATA',
    subtitle: 'FONDO FINANCIERO PARA EL DESARROLLO DE LA CUENCA DEL PLATA',
    senior: "Calificación senior (Moody's): A2 (Outlook estable)",
    mir: "Bond Implied Rating (MIR): Baa2 (gap -3; moda 3Y: Baa2; mediana gap 3Y: -3)",
    reading:
      'Lectura: el mercado descuenta ~3 escalones por debajo del A2, patrón típico en multilaterales de menor escala. En 2024 la foto operativa muestra yield 7,99%, costo 6,39% y spread S&P 1,59 pp —máximo desde 2018— con NIM 4,4% y ROAA 3,4% que respaldan capital y liquidez. Prioridad 2025: sostener capital usable (73,5%) y buffers de liquidez para cerrar brecha; disciplina en crecimiento de activos y visibilidad del pipeline consolidan el Outlook estable.',
  },
  CAF: {
    title: 'CAF',
    subtitle: 'CAF – BANCO DE DESARROLLO DE AMÉRICA LATINA Y EL CARIBE',
    senior: "Calificación senior (Moody's): Aa3",
    mir: "Bond Implied Rating (MIR): A3 (gap -3; moda 3Y: A2; mediana gap 3Y: -2)",
    reading:
      'Lectura: el MIR se mantiene 2–3 notches por debajo de la senior. Señal de prima de riesgo país/portafolio más que de perfil estructural. Mantener colchones de liquidez y diversificación de fondeo ayuda a estrechar el gap. El mercado sigue escudriñando la mezcla geográfica y la concentración en soberanos, por lo que una agenda visible de emisiones temáticas y swaps de pasivos puede acelerar la convergencia.',
  },
  IADB: {
    title: 'BID',
    subtitle: 'BANCO INTERAMERICANO DE DESARROLLO',
    senior: "Calificación senior (Moody's): Aaa",
    mir: "Bond Implied Rating (MIR): Aa1 (gap -1; moda 3Y: Aa1; mediana gap 3Y: -1)",
    uir: "Unsecured Implied Rating (UIR): Aaa (gap 0; moda 3Y: Aa1; mediana gap 3Y: -1)*",
    reading:
      'Lectura: señal de mercado muy sólida: el MIR descuenta solo un notch, y el UIR más reciente está alineado con la calificación oficial. La percepción de protección al acreedor permanece alta. La profundidad de la base inversora y la consistencia de la liquidez secundaria sostienen ese estatus; mientras los spreads se mantengan en zona alta single-digit, la curva sigue operando como referente regional.',
  },
  IBRD: {
    title: 'BIRF (Banco Mundial)',
    subtitle: 'BANCO INTERNACIONAL DE RECONSTRUCCIÓN Y FOMENTO',
    senior: "Calificación senior (Moody's): Aaa",
    mir: 'Bond Implied Rating (MIR): Aa1 (gap -1; moda 3Y: Aa1; mediana gap 3Y: -1)',
    reading:
      'Lectura: patrón espejo del BID: leve descuento de precio (-1) consistente en 3 años, compatible con un estatus "quasi-soberano" y manejo prudente del riesgo. La estabilidad del gap refleja confianza en la gestión anticíclica del balance, aunque el mercado monitorea el ritmo de capitalizaciones y la coordinación con IFC/MIGA como parte del paquete World Bank Group.',
  },
  'CDB-CAR': {
    title: 'CDB',
    subtitle: 'BANCO DE DESARROLLO DEL CARIBE',
    senior: "Calificación senior (Moody's): Aa1",
    mir: 'Bond Implied Rating (MIR): Baa1 (gap -6; moda 3Y: Aa2; mediana gap 3Y: -2)',
    reading:
      'Lectura: el último dato muestra un gap amplio (–6) —posible efecto de liquidez de emisión y profundidad de mercado— aunque la mediana (-2) sugiere que el castigo extremo no es persistente. Enfocar en frecuencia/tamaño de colocaciones y base de inversores. Una estrategia de relanzar benchmarks en dólares y reforzar garantías cruzadas con accionistas sería clave para estabilizar la lectura del mercado.',
  },
  CABEI: {
    title: 'BCIE (CABEI)',
    subtitle: 'BANCO CENTROAMERICANO DE INTEGRACIÓN ECONÓMICA',
    senior: "Calificación senior (Moody's): Aa3",
    mir: 'Bond Implied Rating (MIR): Baa1 (gap -4; moda 3Y: A3; mediana gap 3Y: -2)',
    reading:
      'Lectura: el mercado pide prima relevante (–4 en el último punto), pero el histórico de 3 años indica castigo típico de –2. La ejecución en gobernanza y liquidez será la palanca para recomprimir spreads. Mostrar planes creíbles de capitalización y reforzar la transparencia en riesgos país dentro de la cartera ayudaría a convencer al mercado de que el castigo reciente fue más coyuntural que estructural.',
  },
}

MARKET_SIGNAL_ANALYSIS_BY_CODE.BCIE = MARKET_SIGNAL_ANALYSIS_BY_CODE.CABEI

const MARKET_SIGNAL_ANALYSIS_BY_NAME = {
  'FONDO FINANCIERO PARA EL DESARROLLO DE LA CUENCA DEL PLATA': MARKET_SIGNAL_ANALYSIS_BY_CODE.FONPLATA,
  'FONPLATA': MARKET_SIGNAL_ANALYSIS_BY_CODE.FONPLATA,
  'INTER-AMERICAN DEVELOPMENT BANK': MARKET_SIGNAL_ANALYSIS_BY_CODE.IADB,
  'INTER-AMERICAN DEVELOPMENT BANK (IDB)': MARKET_SIGNAL_ANALYSIS_BY_CODE.IADB,
  'BANCO INTERAMERICANO DE DESARROLLO': MARKET_SIGNAL_ANALYSIS_BY_CODE.IADB,
  'BANCO INTERAMERICANO DE DESARROLLO (BID)': MARKET_SIGNAL_ANALYSIS_BY_CODE.IADB,
  'IBRD WORLD BANK': MARKET_SIGNAL_ANALYSIS_BY_CODE.IBRD,
  'IBRD – WORLD BANK': MARKET_SIGNAL_ANALYSIS_BY_CODE.IBRD,
  'IBRD - WORLD BANK': MARKET_SIGNAL_ANALYSIS_BY_CODE.IBRD,
  'BANCO INTERNACIONAL DE RECONSTRUCCION Y FOMENTO': MARKET_SIGNAL_ANALYSIS_BY_CODE.IBRD,
  'BANCO INTERNACIONAL DE RECONSTRUCCIÓN Y FOMENTO': MARKET_SIGNAL_ANALYSIS_BY_CODE.IBRD,
  'CORPORACION ANDINA DE FOMENTO': MARKET_SIGNAL_ANALYSIS_BY_CODE.CAF,
  'CAF – CORPORACIÓN ANDINA DE FOMENTO': MARKET_SIGNAL_ANALYSIS_BY_CODE.CAF,
  'CAF - CORPORACIÓN ANDINA DE FOMENTO': MARKET_SIGNAL_ANALYSIS_BY_CODE.CAF,
  'CAF – CORPORACION ANDINA DE FOMENTO': MARKET_SIGNAL_ANALYSIS_BY_CODE.CAF,
  'CAF - CORPORACION ANDINA DE FOMENTO': MARKET_SIGNAL_ANALYSIS_BY_CODE.CAF,
  'CAF – BANCO DE DESARROLLO DE AMERICA LATINA Y EL CARIBE': MARKET_SIGNAL_ANALYSIS_BY_CODE.CAF,
  'CAF – BANCO DE DESARROLLO DE AMÉRICA LATINA Y EL CARIBE': MARKET_SIGNAL_ANALYSIS_BY_CODE.CAF,
  'CARIBBEAN DEVELOPMENT BANK': MARKET_SIGNAL_ANALYSIS_BY_CODE['CDB-CAR'],
  'CDB – CARIBBEAN DEVELOPMENT BANK': MARKET_SIGNAL_ANALYSIS_BY_CODE['CDB-CAR'],
  'CDB - CARIBBEAN DEVELOPMENT BANK': MARKET_SIGNAL_ANALYSIS_BY_CODE['CDB-CAR'],
  'BANCO DE DESARROLLO DEL CARIBE': MARKET_SIGNAL_ANALYSIS_BY_CODE['CDB-CAR'],
  'CENTRAL AMERICAN BANK FOR ECONOMIC INTEGRATION': MARKET_SIGNAL_ANALYSIS_BY_CODE.CABEI,
  'BANCO CENTROAMERICANO DE INTEGRACION ECONOMICA': MARKET_SIGNAL_ANALYSIS_BY_CODE.CABEI,
  'CENTRAL AMERICAN BANK FOR ECONOMIC INTEGRATION (CABEI)': MARKET_SIGNAL_ANALYSIS_BY_CODE.CABEI,
  'BANCO CENTROAMERICANO DE INTEGRACION ECONOMICA (BCIE)': MARKET_SIGNAL_ANALYSIS_BY_CODE.CABEI,
  'BANCO CENTROAMERICANO DE INTEGRACIÓN ECONÓMICA': MARKET_SIGNAL_ANALYSIS_BY_CODE.CABEI,
  'BCIE': MARKET_SIGNAL_ANALYSIS_BY_CODE.CABEI,
  'BCIE (CABEI)': MARKET_SIGNAL_ANALYSIS_BY_CODE.CABEI,
}

function normalizeMdbKey(value) {
  if (!value) return ''
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, "'")
    .replace(/[\s–—-]+/g, ' ')
    .toUpperCase()
    .trim()
}

const slideVariants = {
  initial: (direction) => ({
    y: direction === 'down' ? 40 : -40,
    opacity: 0,
  }),
  animate: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: [0.2, 0.8, 0.2, 1] },
  },
  exit: (direction) => ({
    y: direction === 'down' ? -40 : 40,
    opacity: 0,
    transition: { duration: 0.35, ease: [0.2, 0.8, 0.2, 1] },
  }),
}

function makePageComponent(title) {
  return function Page() {
    const location = useLocation()
    const direction = location.state?.dir || 'down'
    const [selectedMarketSignalMdb, setSelectedMarketSignalMdb] = useState(null)

    const RightComponent = title === 'Ratios Moodys'
      ? RatiosMoodysChart
      : title === 'WABR - WASR'
      ? WabrWasrChart
      : title === 'Market Signal'
      ? null
      : title === 'Curvas de Credito'
      ? CreditCurvesChart
      : title === 'Matriz Transición'
      ? TransitionMatrixChart
      : title === 'Costos y Rendimiento'
      ? CostosRendimientoChart
      : title === 'Operativo'
      ? OperativoChart
      : title === 'Balance'
      ? Balance
      : title === 'Balance Ratios'
      ? BalanceRatiosChart
      : title === 'Spread Maturity'
      ? SpreadMaturityChart
      : title === 'Spread Rating'
      ? SpreadRatingChart
      : null

    let leftContent

    if (title === 'Costos y Rendimiento') {
      leftContent = (
        <TextCard title={title}>
          <div className="text-[12px] md:text-[13px] space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Película reciente</div>
              <p>
                En la película reciente de <span className="font-bold text-slate-800">FONPLATA</span> hay tres actos claros: tras la
                compresión 2019–2021, desde 2022 el banco repreció con rapidez y en 2024 muestra yield <strong>7,99%</strong>,
                con el cost of funds estabilizado alto <strong>6,39%</strong> y un spread S&amp;P <strong>1,59 pp</strong> — su mejor nivel desde 2018.
                La secuencia habla de <strong>agilidad comercial</strong> y de que el pasivo acompañó el ciclo sin comerse todo el aumento del ingreso.
              </p>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Foto comparada 2024</div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-[11px] md:text-[12px] text-slate-700">
                  <thead>
                    <tr className="text-slate-500 uppercase text-[10px]">
                      <th className="py-1 pr-3 font-semibold">Indicador</th>
                      <th className="py-1 pr-3 font-semibold text-slate-900">FONPLATA</th>
                      <th className="py-1 font-semibold text-slate-900">Pares 2024</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-1 pr-3">Yield</td>
                      <td className="py-1 pr-3 font-semibold text-slate-900">7,99%</td>
                      <td className="py-1">
                        <div className="flex flex-wrap gap-1">
                          <span className="rounded bg-slate-100 px-1.5 py-[1px] text-[10px] font-medium text-slate-600">CAF: 7,30%</span>
                          <span className="rounded bg-slate-100 px-1.5 py-[1px] text-[10px] font-medium text-slate-600">IBRD: 6,26%</span>
                          <span className="rounded bg-slate-100 px-1.5 py-[1px] text-[10px] font-medium text-slate-600">IADB: 5,72%</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-3">Costo</td>
                      <td className="py-1 pr-3 font-semibold text-slate-900">6,39%</td>
                      <td className="py-1">
                        <div className="flex flex-wrap gap-1">
                          <span className="rounded bg-slate-100 px-1.5 py-[1px] text-[10px] font-medium text-slate-600">CAF: 6,68%</span>
                          <span className="rounded bg-slate-100 px-1.5 py-[1px] text-[10px] font-medium text-slate-600">IADB: &lt; FONPLATA</span>
                          <span className="rounded bg-slate-100 px-1.5 py-[1px] text-[10px] font-medium text-slate-600">IBRD: &lt; FONPLATA</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-3">Spread S&amp;P</td>
                      <td className="py-1 pr-3 font-semibold text-slate-900">1,59 pp</td>
                      <td className="py-1">
                        <div className="flex flex-wrap gap-1">
                          <span className="rounded bg-slate-100 px-1.5 py-[1px] text-[10px] font-medium text-slate-600">CAF: 1,06 pp</span>
                          <span className="rounded bg-slate-100 px-1.5 py-[1px] text-[10px] font-medium text-slate-600">IADB: 0,96 pp</span>
                          <span className="rounded bg-slate-100 px-1.5 py-[1px] text-[10px] font-medium text-slate-600">IBRD: 0,76 pp</span>
                          <span className="rounded bg-emerald-100 px-1.5 py-[1px] text-[10px] font-semibold text-emerald-700">CABEI: &gt; FONPLATA</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
          </div>
        </TextCard>
      )
    } else if (title === 'Market Signal') {
      const codeKey = selectedMarketSignalMdb?.mdb_code
        ? String(selectedMarketSignalMdb.mdb_code).toUpperCase().trim()
        : ''
      const nameKey = normalizeMdbKey(selectedMarketSignalMdb?.mdb_name || '')
      const analysis =
        (codeKey && MARKET_SIGNAL_ANALYSIS_BY_CODE[codeKey]) ||
        (nameKey && MARKET_SIGNAL_ANALYSIS_BY_NAME[nameKey]) ||
        null

      leftContent = (
        <TextCard title={title}>
          <div className="text-[12px] md:text-[13px] space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">
                Insight según selección
              </div>
              {analysis ? (
                <div className="rounded-md border border-slate-200 bg-white p-3 text-slate-700">
                  <p className="font-semibold text-slate-900">{analysis.title}</p>
                  {analysis.subtitle && (
                    <p className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-500">{analysis.subtitle}</p>
                  )}
                  <ul className="mt-2 list-disc space-y-1 pl-4 marker:text-slate-400">
                    <li>{analysis.senior}</li>
                    <li>{analysis.mir}</li>
                    {analysis.uir ? <li>{analysis.uir}</li> : null}
                  </ul>
                  <p className="mt-2">{analysis.reading}</p>
                </div>
              ) : selectedMarketSignalMdb ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
                  <p className="font-semibold">Sin ficha predefinida</p>
                  <p className="text-sm">
                    No hay comentario cargado para {selectedMarketSignalMdb.mdb_name || selectedMarketSignalMdb.mdb_code}.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-slate-600">
                  Selecciona un MDB en el gráfico para ver su lectura.
                </div>
              )}
            </div>
          </div>
        </TextCard>
      )
    } else if (title === 'WABR - WASR') {
      leftContent = (
        <TextCard title={title}>
          <div className="text-[12px] md:text-[13px] space-y-3">
            <p>
              <strong>WASR</strong> (respaldo de accionistas) suele estar por encima de <strong>WABR</strong> (riesgo de clientes). En 2022–2023 el WABR se debilitó y en 2024 se
              estabiliza. La distancia entre ambos es el “colchón” que protege a los acreedores.
            </p>
            <p>
              En multilaterales, esto significa que la fortaleza de los socios compensa el riesgo de la cartera. Cuando el WABR sube (más riesgo), ese
              colchón del WASR ayuda a sostener la confianza y el acceso a financiamiento.
            </p>
            <div className="mt-4 md:mt-6">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Comparativa simple</div>
              <ul className="list-disc pl-4 marker:text-slate-400 space-y-1">
                <li><span className="font-semibold">FONPLATA</span>: WASR alto (A) y WABR en Ba/B. Brecha amplia, típica de multilaterales regionales.</li>
                <li><span className="font-semibold">CAF</span>: patrón parecido. <span className="font-semibold">IADB</span> e <span className="font-semibold">IBRD</span>: más respaldo y cartera algo mejor; brecha más chica.</li>
              </ul>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-slate-700">
              <strong>Qué importa:</strong> cuidar calidad y diversificación del portafolio, liquidez y capital; así el WABR puede acercarse a investment grade.
            </div>
            
          </div>
        </TextCard>
      )
    } else if (title === 'Balance') {
      leftContent = (
        <TextCard title={title}>
          <div className="text-[12px] md:text-[13px] space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Pulso 2020–2024</div>
              <p>
                El balance escala con mesura: activos +<strong>1–2% anual</strong>, cartera más pesada (<strong>71%</strong>→<strong>74%</strong> de los activos, pico 76% en 2023) y un patrimonio
                que acelera (<strong>4–5% anual</strong>) para comprimir el apalancamiento de <strong>3,4×</strong> a <strong>2,85×</strong>. Más crédito, misma prudencia.
              </p>
            </div>
            <div className="mt-4 md:mt-6">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Zoom 2022–2024</div>
              <p>
                Ritmo estable: activos +<strong>2,4%</strong> anual, préstamos +<strong>1,4%</strong>, equity +<strong>3,3%</strong>, pasivos +<strong>2,2%</strong>. La mezcla permanece concentrada en
                crédito (~74% de los activos) y la capitalización se sitúa en torno al <strong>26%</strong> de equity/activos.
              </p>
            </div>
            
            
          </div>
        </TextCard>
      )
    } else if (title === 'Balance Ratios') {
      leftContent = (
        <TextCard title={title}>
          <div className="text-[12px] md:text-[13px] space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Pulso 2020–2024</div>
              <p>
                La rentabilidad se recompuso tras la pandemia: el NIM promedió <strong>2,94%</strong> (CAF 1,43%, IADB 1,18%, IBRD 0,86%), el ROAA <strong>2,57%</strong> y el ROAE <strong>4,31%</strong>,
                todos por encima de pares. El mensaje: repricing eficaz donde el ingreso sube más que el costo y la eficiencia preserva esa ventaja.
              </p>
            </div>
            <div className="mt-4 md:mt-6">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Zoom 2022–2024</div>
              <p>
                El impulso se acelera: NIM <strong>3,58%</strong>, ROAA <strong>3,07%</strong>, ROAE <strong>5,38%</strong> promedio (CAF 1,78/1,00/3,66; IADB 1,28/0,87/3,47; IBRD 0,93/0,75/4,51).
                La foto 2024 refuerza el liderazgo con NIM <strong>4,4%</strong> | ROAA <strong>3,39%</strong> | ROAE <strong>5,98%</strong>.
              </p>
            </div>
            
            
          </div>
        </TextCard>
      )
    } else if (title === 'Ratios Moodys') {
      leftContent = (
        <TextCard title={title}>
          <div className="text-[12px] md:text-[13px] space-y-2.5">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Pulso 2019–2024</div>
              <p>
                El balance trabaja más sin salir de zona prudente: el apalancamiento ronda <strong>1,4×</strong> y la cobertura de capital todavía cubre casi tres cuartas partes de la cartera.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[10px] md:text-[11px] text-slate-700">
                  <thead>
                    <tr className="text-slate-500 uppercase">
                      <th className="py-1 pr-3 font-semibold">Indicador</th>
                      <th className="py-1 pr-3 font-semibold text-slate-900">2019</th>
                      <th className="py-1 font-semibold text-slate-900">2024</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-1 pr-3">Apalancamiento</td>
                      <td className="py-1 pr-3 text-slate-600">0,97×</td>
                      <td className="py-1 font-semibold text-slate-900">1,42×</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-3">Capital usable / préstamos</td>
                      <td className="py-1 pr-3 text-slate-600">110%</td>
                      <td className="py-1 font-semibold text-slate-900">73,5%</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-3">Margen NIM</td>
                      <td className="py-1 pr-3 text-slate-600">3,2%</td>
                      <td className="py-1 font-semibold text-slate-900">4,4%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-4 md:mt-6">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Rentabilidad y margen</div>
              <p>
                En 2024 la rentabilidad sigue firme, traccionada por el margen elevado.
              </p>
              <div className="flex flex-wrap gap-2 text-[10px] md:text-[11px] leading-snug text-slate-700">
                <span className="rounded bg-slate-100 px-2 py-[3px] font-medium">ROAA: 3,4%</span>
                <span className="rounded bg-slate-100 px-2 py-[3px] font-medium">ROE: 6,0%</span>
                <span className="rounded bg-slate-100 px-2 py-[3px] font-medium">NIM: 4,4%</span>
              </div>
            </div>
            <div className="mt-4 md:mt-6">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Zoom 2023–2024</div>
              <p>
                Último año con más empuje del balance y leves ajustes: apalancamiento <strong>1,26× → 1,42×</strong>, cobertura <strong>83% → 73,5%</strong>, margen estable en <strong>4,0%</strong>
                y rentabilidad que se normaliza (ROAA 3,7% → 3,4%; ROE 6,4% → 6,0%).
              </p>
            </div>
            
          </div>
        </TextCard>
      )
    } else if (title === 'Operativo') {
      leftContent = (
        <TextCard title={title}>
          <div className="text-[12px] md:text-[13px] space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Pulso de eficiencia</div>
              <p>
                El gasto operativo y la dotación pierden peso frente al negocio: los ratios sobre préstamos se parten a la mitad
                (<strong>Op./préstamos</strong> 1,35→0,59; <strong>Personal/préstamos</strong> 0,81→0,37) y sobre equity el gasto queda
                estable en ~0,79 mientras el personal desciende a 0,50 después de 2019.
              </p>
              <p>
                Es un claro <strong>operating leverage</strong>: la cartera y el patrimonio avanzan más rápido que la base de costos y la plantilla.
              </p>
            </div>
            <div className="mt-4 md:mt-6">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Comparativa 2024</div>
              <div className="mt-4 md:mt-5 overflow-x-auto">
                <table className="w-full text-left text-[11px] md:text-[12px] text-slate-700">
                  <thead>
                    <tr className="text-slate-500 uppercase text-[10px]">
                      <th className="py-1 pr-3 font-semibold">Ratio</th>
                      <th className="py-1 pr-3 font-semibold text-slate-900">FONPLATA</th>
                      <th className="py-1 font-semibold text-slate-900">Pares 2024</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-1 pr-3">Op./préstamos</td>
                      <td className="py-1 pr-3 font-semibold text-slate-900">0,59</td>
                      <td className="py-1">
                        <div className="flex flex-wrap gap-1">
                          <span className="rounded bg-slate-100 px-1.5 py-[1px] text-[10px] font-medium text-slate-600">IADB: 0,92</span>
                          <span className="rounded bg-slate-100 px-1.5 py-[1px] text-[10px] font-medium text-slate-600">IBRD: 1,00</span>
                          <span className="rounded bg-slate-100 px-1.5 py-[1px] text-[10px] font-medium text-slate-600">CAF: 1,14</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-3">Op./equity</td>
                      <td className="py-1 pr-3 font-semibold text-slate-900">0,79</td>
                      <td className="py-1">
                        <div className="flex flex-wrap gap-1">
                          <span className="rounded bg-slate-100 px-1.5 py-[1px] text-[10px] font-medium text-slate-600">IADB: 2,63</span>
                          <span className="rounded bg-slate-100 px-1.5 py-[1px] text-[10px] font-medium text-slate-600">IBRD: 4,09</span>
                          <span className="rounded bg-slate-100 px-1.5 py-[1px] text-[10px] font-medium text-slate-600">CAF: 2,40</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-3">Personal/préstamos</td>
                      <td className="py-1 pr-3 font-semibold text-slate-900">0,37</td>
                      <td className="py-1">
                        <div className="flex flex-wrap gap-1">
                          <span className="rounded bg-slate-100 px-1.5 py-[1px] text-[10px] font-medium text-slate-600">IADB: 0,49</span>
                          <span className="rounded bg-slate-100 px-1.5 py-[1px] text-[10px] font-medium text-slate-600">IBRD: 0,49</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-3">Personal/equity</td>
                      <td className="py-1 pr-3 font-semibold text-slate-900">0,50</td>
                      <td className="py-1">
                        <div className="flex flex-wrap gap-1">
                          <span className="rounded bg-slate-100 px-1.5 py-[1px] text-[10px] font-medium text-slate-600">IADB: 1,38</span>
                          <span className="rounded bg-slate-100 px-1.5 py-[1px] text-[10px] font-medium text-slate-600">IBRD: 2,00</span>
                          <span className="rounded bg-slate-100 px-1.5 py-[1px] text-[10px] font-medium text-slate-600">CAF: n/d</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
          </div>
        </TextCard>
      )
    } else if (title === 'Curvas de Credito') {
      leftContent = (
        <TextCard title={title}>
          <div className="text-[12px] md:text-[13px] space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Señal de pricing</div>
              <p>
                Para la franja Aa, la curva se aplana a partir de los 10 años: el mercado paga un spread adicional moderado por
                extender hasta 12–15 años, de modo que las emisiones largas conservan costo competitivo. En cambio, los emisores
                A2 encuentran una cola más empinada; después de los 10 años el sobreprecio crece con rapidez y diluye el carry si
                no se ajusta la estructura.
              </p>
            </div>
            
            <div className="mt-4 md:mt-6 rounded-md border border-sky-200 bg-sky-50 p-3 text-sky-900">
              <p className="font-semibold">Lectura ejecutiva:</p>
              <p>
                Curvas ordenadas y diferenciación fina dentro de Aa; el salto a A2 concentra la prima. Extender plazo funciona bien
                para el bloque Aa. En A2, optimizar ventanas 7–10 años y diversificar moneda/inversores ayuda a preservar liquidez
                y cobertura de vencimientos consistente con A2 estable.
              </p>
            </div>
          </div>
        </TextCard>
      )
    } else if (title === 'Spread Maturity') {
      leftContent = (
        <TextCard title={title}>
          <div className="text-[12px] md:text-[13px] space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Lectura rápida</div>
              <p>
                La curva de spreads muestra un escalón claro entre los tramos cortos (1–3Y) y los medios-largos (7–15Y). Las
                brechas tienden a ampliarse en episodios de volatilidad —fines de 2022 y 2024— cuando la punta larga supera los
                150 pb mientras el tramo corto va más contenido.
              </p>
            </div>
            <div className="mt-4 md:mt-6">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">¿Qué vigilar?</div>
              <ul className="list-disc pl-4 marker:text-emerald-600 space-y-1">
                <li>Convergencia entre 1Y y 5Y señaliza menor stress de fondeo.</li>
                <li>Divergencias amplias en 10–15Y anticipan presión sobre emisiones largas.</li>
              </ul>
            </div>
            
          </div>
        </TextCard>
      )
    } else if (title === 'Spread Rating') {
      leftContent = (
        <TextCard title={title}>
          <div className="text-[12px] md:text-[13px] space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Lectura rápida</div>
              <p>
                Los spreads por rating muestran tres bloques claros: investment grade bajo (A2, Baa2) entre 120–220 pb, high
                grade puro (Aaa–Aa3) que oscila en 0–90 pb, y high yield inicial (Ba2) por encima de 300 pb. La compresión 2021
                se revierte en 2022 y desde entonces mantiene una pendiente positiva moderada.
              </p>
            </div>
            <div className="mt-4 md:mt-6">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">¿Cómo usarlo?</div>
              <ul className="list-disc pl-4 marker:text-sky-600 space-y-1">
                <li>Comparar el spread objetivo con el rating meta para nuevas emisiones.</li>
                <li>Monitorear divergencias entre segmentos IG/HY que anticipen cambios de apetito.</li>
              </ul>
            </div>
            
          </div>
        </TextCard>
      )
    } else if (title === 'Matriz Transición') {
      leftContent = (
        <TextCard title={title}>
          <div className="text-[12px] md:text-[13px] space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Lectura rápida</div>
              <p>
                Las transiciones de rating en MDBs muestran alta persistencia en rangos Aa/A con baja probabilidad de degradación abrupta; 
                episodios de volatilidad recientes no alteraron la tendencia de largo plazo.
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-slate-700">
              <p>
                Para sostener A2 estable: proteger capital usable, mantener buffers de liquidez y disciplina en crecimiento del balance; la gobernanza
                y el estatus de acreedor preferente anclan la calificación.
              </p>
            </div>
          </div>
        </TextCard>
      )
    } else {
      leftContent = <TextCard title={title}>Contenido placeholder</TextCard>
    }

    const rightContent =
      title === 'Market Signal'
        ? <MarketSignalChart onSelectedMdbChange={setSelectedMarketSignalMdb} />
        : RightComponent
        ? <RightComponent />
        : (
          <div className="min-h-[60vh] md:min-h-[calc(100dvh-120px)] w-full rounded-xl border-2 border-dashed border-accent/70 bg-white/50 flex items-center justify-center text-sm text-slate-500">
            Gráfico / Tabla
          </div>
          )

    return (
      <Motion.main
        className="bg-white"
        custom={direction}
        variants={slideVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <PageLayout
          fullWidth={new URLSearchParams(location.search).get('all') === '1'}
          left={leftContent}
          right={rightContent}
        />
      </Motion.main>
    )
  }
}

function Home() {
  const location = useLocation()
  const direction = location.state?.dir || 'down'
  const [menuOpen, setMenuOpen] = useState(false)
  const focusAreas = [
    {
      title: 'Costos y Rendimiento',
      description:
        'Evolución de yield, cost of funds y spreads para entender cómo FONPLATA capitaliza el ciclo de tasas.',
      path: '/costos-rendimiento',
    },
    {
      title: 'Balance y Apalancamiento',
      description:
        'Composición de activos, ritmo de crecimiento y capitalización frente a pares de referencia.',
      path: '/balance',
    },
    {
      title: 'Ratios de Rentabilidad',
      description:
        'NIM, ROAA y ROAE en tendencia larga, con zoom 2022–2024 y comparación con CAF, IADB e IBRD.',
      path: '/balance-ratios',
    },
    {
      title: 'Eficiencia Operativa',
      description:
        'Gasto, plantilla y productividad para medir el operating leverage del modelo MDB.',
      path: '/operativo',
    },
  ]
  const pulseMetrics = [
    { code: 'FONPLATA', label: 'Yield 2024', value: '7,99%' },
    { code: 'FONPLATA', label: 'Spread S&P', value: '1,59 pp' },
    { code: 'FONPLATA', label: 'ROAA 2024', value: '3,4%' },
    { code: 'FONPLATA', label: 'NIM 2024', value: '4,4%' },
    { code: 'FONPLATA', label: 'Capital usable/préstamos', value: '73,5%' },
    { code: 'FONPLATA', label: 'Apalancamiento Moody’s', value: '1,42×' },
  ]
  const toggleMenu = () => setMenuOpen((prev) => !prev)
  const closeMenu = () => setMenuOpen(false)

  return (
    <Motion.main
      className="bg-white"
      custom={direction}
      variants={slideVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12 rounded-3xl border border-slate-200 bg-white p-8 md:p-12 shadow-sm">
          <div className="mx-auto max-w-3xl text-center space-y-5">
            <h1 className="text-3xl md:text-4xl font-semibold text-slate-900">
              Indicadores Financieros MDB&apos;s
            </h1>
            
            
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/costos-rendimiento"
                state={{ dir: 'down' }}
                className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-white transition hover:opacity-90 focus-ring"
              >
                Ir al primer tablero
              </Link>
              <div className="relative">
                <button
                  type="button"
                  onClick={toggleMenu}
                  className="inline-flex items-center justify-center rounded-md border border-slate-200 px-5 py-2.5 text-slate-700 transition hover:border-primary focus-ring"
                >
                  Ir a otra sección
                  <svg
                    className="ml-2 h-4 w-4 text-slate-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.105l3.71-3.875a.75.75 0 011.08 1.04l-4.25 4.437a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 z-10 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-lg">
                    <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tableros</p>
                    <div className="mt-2 space-y-1">
                      {focusAreas.map((area) => (
                        <Link
                          key={area.title}
                          to={area.path}
                          state={{ dir: 'down' }}
                          onClick={closeMenu}
                          className="block rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-primary/10 hover:text-primary focus-ring"
                        >
                          {area.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-6 md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pulso 2024</p>
                <h2 className="text-xl md:text-2xl font-semibold text-slate-900">Números que definen la conversación</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Punto de partida para los análisis de detalle: pricing, rentabilidad y solvencia tal como llegan a 2024.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                {pulseMetrics.map((metric) => {
                  const accent = colorForMdbCode(metric.code)
                  return (
                    <div
                      key={metric.label}
                      className="rounded-lg border bg-white/90 px-3 py-2 text-left text-sm font-medium shadow-sm"
                      style={{ borderColor: accent }}
                    >
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">{metric.label}</div>
                      <div className="text-base font-semibold" style={{ color: accent }}>
                        {metric.value}
                      </div>
                      <div className="text-[10px] text-slate-500">{metric.code}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </Motion.main>
  )
}

const routes = pages.map((p) => ({
  ...p,
  Component: p.path === '/' ? Home : makePageComponent(p.title),
}))

export default routes

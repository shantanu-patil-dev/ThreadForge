# Smart Industrial 4:1 Multiplexer Sensor Monitoring & Fault Alert System

> **Live Application URL**: [http://localhost:3000](http://localhost:3000)  
> **Tech Stack**: React 19 + TypeScript + Vite + Tailwind CSS + Recharts + Lucide Icons + Vitest  
> **Theme**: Industrial Neutral SCADA Palette (Warm White `#FAF9F6`, Light Beige `#EDE4D3`, Bottle Green `#14532D`, Deep Green-Black `#18352A`, Amber `#B7791F`, Red `#B42318` — *strictly no blue or purple*)

---

## 1. Quick Start Guide

### Prerequisites
- Node.js (v18 or higher recommended; v24 tested)
- npm

### Launch Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the Vite development server (configured on port 3000)
npm run dev

# 3. Open your browser and navigate to:
# http://localhost:3000
```

### Run Automated Unit Test Suite

```bash
# Runs all 18 unit tests, verifying logic and all 64 truth table combinations
npm test
```

### Production Build

```bash
npm run build
```

---

## 2. Project Overview & Motivation

In standard electronics lab courses, multiplexer experiments are frequently limited to static breadboard circuits with 74xx ICs, manual switches, and LEDs. While these verify gate truth tables, they do not demonstrate why multiplexers are central to real-world instrumentation and Industrial Data Acquisition (DAQ) systems.

This project delivers a **Smart Industrial Sensor Monitoring and Fault Alert System** powered by a **4:1 Multiplexer**:
- **Resource Sharing**: Demonstrates how 4 distinct analog transducers (**Bearing Temperature**, **Hydraulic Pressure**, **Turbine Vibration**, **Ambient Humidity**) share a single microcontroller ADC channel.
- **Cost Reduction**: Replaces 4 separate expensive ADCs with 1 multiplexed converter, cutting pin count and bill-of-materials cost by over 60%.
- **Digital Gate Verification**: Provides an interactive circuit explorer with dynamic signal path animation, intermediate gate-level AND-OR decomposition, and an automated 64-case truth table validation lab.
- **Fault Diagnostics**: Distinguishes between physical threshold violations, open-circuit wire breaks ("No Signal"), and ADC rail saturation errors.

---

## 3. Mathematical & Digital Logic Model

### 4:1 Multiplexer Truth Table

| S1 (MSB) | S0 (LSB) | Selected Channel | Output Equation | Active Minterm |
|:---:|:---:|:---:|:---:|:---:|
| **0** | **0** | **D0** (Temperature) | $Y = D0$ | $m_0 = \overline{S1}\cdot\overline{S0}$ |
| **0** | **1** | **D1** (Pressure) | $Y = D1$ | $m_1 = \overline{S1}\cdot S0$ |
| **1** | **0** | **D2** (Vibration) | $Y = D2$ | $m_2 = S1\cdot\overline{S0}$ |
| **1** | **1** | **D3** (Humidity) | $Y = D3$ | $m_3 = S1\cdot S0$ |

### Canonical Sum-of-Products (SOP) Formula
$$Y = (D0 \cdot \overline{S1} \cdot \overline{S0}) + (D1 \cdot \overline{S1} \cdot S0) + (D2 \cdot S1 \cdot \overline{S0}) + (D3 \cdot S1 \cdot S0)$$

- **Select Bits**: $n = \log_2(4) = 2$ lines ($S1, S0$).
- **Intermediate Gates**: 2 NOT inverters, four 3-input AND gates (one per minterm), and one 4-input OR gate.

---

## 4. Application Architecture & Views

The application provides 7 dedicated modules:

1. **Overview Page**:
   - Executive dashboard displaying system status, active MUX address ($S1S0$), live measurement, DAQ stage flow diagram, channel matrix, and timestamped event log.
2. **Live Monitoring**:
   - Telemetry cards for all 4 transducers with live values, engineering units, status badges, and ADC raw voltages.
   - **Recharts** live telemetry graph charting the selected channel with threshold reference lines and status-colored points (green = nominal, amber = warning, red = critical).
3. **4:1 MUX Explorer**:
   - Interactive circuit schematic with SVG trapezoid MUX body, toggleable data inputs ($D0–D3$), select line switches ($S1, S0$), animated active signal propagation, and gate-level AND-OR diagnostic view.
4. **Experiment Lab**:
   - Single-vector assertion workbench (expected vs actual logic equality).
   - Automated **64-Case Exhaustive Truth Table Test Runner** exercising all $2^2 \times 2^4 = 64$ combinations with 100% verification status and result filtering.
5. **Fault Simulator**:
   - Demonstrates reversible plant failure modes: High Temperature Spike, Hydraulic Pressure Surge, Turbine Vibration Anomaly, Open-Circuit Wire Break, and ADC Rail Saturation.
6. **Channel Configuration**:
   - Rename transducers, change units, adjust warning/critical thresholds, and enable/disable channels with browser `localStorage` persistence.
7. **Documentation & Viva Guide**:
   - In-depth theoretical analysis, comparison between shared vs dedicated ADCs, settling time physics, Bill of Materials (BOM), and Viva Voce oral examination prep.

---

## 5. Engineering Distinctions & Physical Considerations

### Analog vs Digital Multiplexers
- **Digital MUX (e.g. 74HC153)**:
  - Built from discrete logic gates (AND/OR).
  - Handles only discrete logic 0 and 1 levels (0V or 5V).
  - Unidirectional: cannot pass intermediate sensor voltages (e.g. 2.45V) without quantization corruption.
- **Analog MUX (e.g. CD4052, 74HC4051)**:
  - Built from bilateral CMOS transmission gates (NMOS + PMOS pairs).
  - Low on-resistance ($R_{ON} \approx 60\Omega\text{--}100\Omega$).
  - Bidirectional: passes continuous analog voltages from transducers into a shared microcontroller ADC.

### Switching Delay & Settling Time
When switching select lines ($S1, S0$), firmware must account for analog RC settling delay:
$$t_{SETTLE} \approx 5 \times (R_{ON} + R_S) \times C_{IN} \approx 1\text{--}5\,\mu\text{s}$$
The microcontroller must pause for $t_{SETTLE}$ after changing select lines before initiating an ADC conversion.

---

## 6. Physical Hardware Blueprint & Bill of Materials (BOM)

To build a physical bench prototype, the following architecture is specified:

- **Microcontroller**: Arduino Uno R3 / STM32 BluePill / ESP32
- **Multiplexer IC**: CD4052BE (Dual 4:1) or 74HC4051 (8:1 Analog MUX)
- **Connections**:
  - MCU GPIO 2 $\rightarrow$ MUX Pin 10 ($S0$)
  - MCU GPIO 3 $\rightarrow$ MUX Pin 9 ($S1$)
  - MUX Common Out $\rightarrow$ MCU ADC Pin A0
  - MUX /ENABLE $\rightarrow$ GND (Active Low)
  - Transducers 0–3 $\rightarrow$ MUX Inputs 0–3

### Estimated Cost Breakdown

| Item | Component | Function | Approx Cost |
|:---:|:---|:---|:---:|
| 1 | CD4052BE / 74HC4051 | CMOS Analog MUX IC | ₹35 (~$0.45) |
| 2 | LM35 Precision Temp Sensor | 10 mV/°C linear temp output | ₹70 (~$0.85) |
| 3 | 0.5–4.5V Pressure Transducer | Hydraulic piezoresistive sensor | ₹450 (~$5.50) |
| 4 | ADXL335 3-Axis Accelerometer | Analog vibration velocity | ₹120 (~$1.45) |
| 5 | Capacitive Soil/Ambient RH | Enclosure humidity sensor | ₹60 (~$0.75) |
| 6 | Arduino Uno / STM32 | 10-bit ADC & Serial Comms | ₹400 (~$4.80) |
| **Total** | **Hardware Bench Prototype** | | **~₹1,135 (~$13.80)** |

---

## 7. Automated Test Suite Results

The project includes unit tests located in `src/lib/__tests__/`:

```
Test Files  2 passed (2)
Tests       18 passed (18)
Duration    ~430ms

✓ mux.test.ts
  - selects D0 when S1S0 = 00
  - selects D1 when S1S0 = 01
  - selects D2 when S1S0 = 10
  - selects D3 when S1S0 = 11
  - does NOT change output when non-selected inputs toggle
  - immediately updates output when selected input toggles
  - verifies getSelectedChannelIndex correctly maps select bits
  - gate diagnostics correctly activates only selected AND term
  - inactive output when selected input is 0 even if other inputs are 1
  - analog channel routing preserves voltage values
  - executes all 64 truth table combinations with 100% pass rate (0 failures)

✓ sensorSim.test.ts
  - initializes 4 distinct channels with nominal history and valid ranges
  - maps engineering values to ADC voltages
  - triggers CRITICAL status on D0 during HIGH_TEMP fault
  - triggers CRITICAL status on D1 during PRESSURE_SPIKE fault
  - triggers DISCONNECTED status and 0V on D3 during SENSOR_DISCONNECTED fault
  - handles INVALID_READING fault with saturation voltage flag
  - returns DISCONNECTED and null readings when a channel is disabled in config
```

---

## 8. Viva Voce Examination Defense Guide

- **Q: What is a multiplexer?**  
  *A:* A multiplexer is a combinational electronic switch that selects one input signal from many sources and forwards it to a single shared output line based on binary select lines.
- **Q: How many select lines are required for an N-input MUX?**  
  *A:* $n = \log_2(N)$ lines. For a 4:1 MUX, $n = \log_2(4) = 2$ select lines ($S1, S0$).
- **Q: Why use a MUX in data acquisition instead of separate ADCs?**  
  *A:* Resource efficiency. ADCs occupy silicon area, require dedicated reference pins, and increase system cost. An analog MUX allows multiple sensors to share one high-precision ADC channel using time-division polling.
- **Q: What is the Boolean formula of a 4:1 MUX?**  
  *A:* $Y = D0\cdot\overline{S1}\cdot\overline{S0} + D1\cdot\overline{S1}\cdot S0 + D2\cdot S1\cdot\overline{S0} + D3\cdot S1\cdot S0$.
- **Q: Why can't a digital MUX (74HC153) replace an analog MUX (CD4052) for analog sensors?**  
  *A:* Digital MUXes use logic gates that interpret voltages strictly as binary LOW or HIGH. Analog MUXes use bidirectional CMOS transmission gates with low on-resistance ($R_{ON}$), preserving continuous analog voltages.
- **Q: How does the system distinguish an open circuit from an alert?**  
  *A:* An open circuit produces a 0.00V pull-down ("No Signal" / communication failure), whereas a threshold violation outputs a valid analog voltage that exceeds safe limits.

---

## 9. Design System Compliance

| Token | Hex Value | Application |
|:---|:---|:---|
| Background | `#FAF9F6` | Warm White page background |
| Panels | `#EDE4D3` | Light Beige container surfaces & toolbars |
| Card Surface | `#FFFFFF` | White card background |
| Border | `#DED8CC` | Subtle neutral border |
| Primary Accent | `#14532D` | Bottle Green for headers, active buttons, MUX paths |
| Primary Hover | `#166534` | Darker bottle green on interaction |
| Primary Dark | `#18352A` | Deep Green-Black for high-contrast typography |
| Warning Alert | `#B7791F` | Amber for warning thresholds & status pills |
| Critical Alert | `#B42318` | Red for critical trips, sensor faults & saturation |

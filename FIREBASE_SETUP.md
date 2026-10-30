# Firebase Integration — Smart Polyhouse (`smart-polyhouse-dc97b`)

## Realtime Database URL
`https://smart-polyhouse-dc97b-default-rtdb.asia-southeast1.firebasedatabase.app`

## Database Structure

```
smart-polyhouse-dc97b (root)
├── sensors/
│   ├── temperature     ← number  (°C)    aggregated/average
│   ├── humidity        ← number  (%)     aggregated/average
│   ├── lux             ← number  (lux)   calibrated light
│   ├── hoursLit        ← number  (hours) photoperiod hours
│   ├── soilMoisture    ← number  (%)     soil moisture percentage
│   ├── mq2             ← number  (ppm)   air/smoke sensor
│   ├── temp1, temp2    ← number  (°C)    DHT1 & DHT2 sensors
│   ├── hum1, hum2      ← number  (%)     DHT1 & DHT2 humidity
│   ├── ldr1, ldr2      ← number  (ADC)   LDR sensor readings
│   ├── soil1Percent    ← number  (%)     analog capacitive probe
│   ├── soil2Wet        ← boolean         digital soil probe
│   ├── led12Percent    ← number  (0-100) PWM channel 1 & 2
│   ├── led34Percent    ← number  (0-100) PWM channel 3 & 4
│   ├── pwm1, pwm2      ← number  (0-255) PWM brightness levels
│   ├── lightRaw        ← number  (ADC)   average raw LDR
│   └── ledBrightness   ← number  (0-100) average LED brightness
├── actuators/
│   └── humidifier      ← boolean         relay state
└── controls/
    ├── mode            ← "Auto" | "Manual"   written by dashboard
    ├── ledOn           ← boolean             written by dashboard
    ├── ledIntensity    ← number (0–100)       written by dashboard
    └── mistOn          ← boolean             written by dashboard
```

## Security Rules (Deployed via Firebase MCP)

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

## Web Application Configuration

Configured in `.env` and `src/lib/firebase.ts`:
- **Project ID**: `smart-polyhouse-dc97b`
- **Web App ID**: `1:1001801846441:web:19cf298455d8edd61a23b8`
- **API Key**: `AIzaSyA0v6MgduPFUY1wOdDmvXkklP8ocWVnreE`
- **Database URL**: `https://smart-polyhouse-dc97b-default-rtdb.asia-southeast1.firebasedatabase.app`

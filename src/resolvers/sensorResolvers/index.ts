// Node 18+ has global fetch; declare for TS
declare const fetch: any;

const GOVEE_BASE = "https://openapi.api.govee.com/router/api/v1";

const goveeRequest = async (
  path: string,
  apiKey: string,
  payload: Record<string, any> = {}
) => {
  const res = await fetch(`${GOVEE_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Govee-API-Key": apiKey,
    },
    body: JSON.stringify({
      requestId: Date.now().toString(),
      payload,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Govee API error ${res.status}: ${text?.slice(0, 200) || "unknown"}`
    );
  }
  return res.json();
};

const mapDevices = (raw: any) => {
  const devices = raw?.data?.devices || raw?.data || [];
  return (devices as any[]).map((d) => ({
    device: d.device,
    model: d.model,
    deviceName: d.deviceName || d.deviceNameEn || d.name || null,
  }));
};

const mapReading = (raw: any) => {
  const properties = raw?.data?.properties || raw?.data || [];
  let temperature: number | null = null;
  let humidity: number | null = null;
  let battery: number | null = null;

  (properties as any[]).forEach((p) => {
    if (p?.temperature?.value !== undefined) {
      temperature = Number(p.temperature.value);
    }
    if (p?.humidity?.value !== undefined) {
      humidity = Number(p.humidity.value);
    }
    if (p?.battery?.value !== undefined) {
      battery = Number(p.battery.value);
    }
    if (p?.type === "temperature") {
      temperature = Number(p.value);
    }
    if (p?.type === "humidity") {
      humidity = Number(p.value);
    }
    if (p?.type === "battery") {
      battery = Number(p.value);
    }
  });

  return {
    temperature,
    humidity,
    battery,
    retrieved_at: new Date().toISOString(),
  };
};

export const sensorResolvers = {
  Query: {
    goveeDevices: async (_: any, args: { apiKey: string }) => {
      const result = await goveeRequest("/user/devices", args.apiKey, {});
      return mapDevices(result);
    },
    goveeDeviceState: async (
      _: any,
      args: { apiKey: string; device: string; model: string }
    ) => {
      const result = await goveeRequest("/device/state", args.apiKey, {
        device: args.device,
        model: args.model,
      });
      return mapReading(result);
    },
  },
};

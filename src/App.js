import { useState, useEffect, useRef } from "react";

export default function PaymentUI() {
  const [amount, setAmount] = useState("");
  const [machineNumber, setMachineNumber] = useState("");
  const [log, setLog] = useState([]);
  const [KBDKvalues,setKBDKvalues]=useState({kbd1:10,kbd2:11,kbd3:20,kbd4:21});
  const KBDKvaluesRef = useRef(KBDKvalues);

  const tidRef = useRef("");
  const machineNumberRef = useRef(machineNumber);

  const wsRef = useRef(null);
  const intervalRef = useRef(null);

  const addLog = (msg) =>
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const generateTID = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit random
};


  // ----------------------------- WebSocket Connect ------------------------------
  const connectWebSocket = () => {
    const ws = new WebSocket("ws://snackboss-iot.in:3030"); // <-- your WS URL here
    wsRef.current = ws;

    ws.onopen = () => {
      addLog("✅ WebSocket Connected");
    };

    ws.onmessage = (evt) => {
    const msg = evt.data.trim();
    addLog("RECV ← " + msg);
        // --- AUTO RULE 1: When AmountReceived comes, send SUCCESS ---

        if (msg.startsWith("*") && msg.endsWith("#")) {

    const pure = msg.replace("*", "").replace("#", "");
    const parts = pure.split(",");
    
    console.log(parts);
    console.log("TID REF:", tidRef.current);
    if (parts.length === 3) {
      const recvMachine = parts[0];
      const recvTid = parts[1];
      const status = parts[2];

      console.log(typeof recvMachine, typeof machineNumberRef.current,typeof recvTid,);
      console.log("Comparing:", recvMachine == machineNumberRef.current, recvTid == tidRef.current, status == "AmountReceived");

      // CHECK if matches our machine number + TID + AmountReceived
      if (
        recvMachine == machineNumberRef.current &&
        recvTid == tidRef.current && // OR recvTid === tid if you use a separate TID
        status == "AmountReceived"
      ) {
        console.log(parts);
        sendCommand("*SUCCESS#");
        setTimeout(()=>{
          sendCommand(`*KBDK${tidRef.current},${KBDKvaluesRef.current.kbd1},${KBDKvaluesRef.current.kbd2},${KBDKvaluesRef.current.kbd3},${KBDKvaluesRef.current.kbd4}#`);
        },1000)
        tidRef.current = ""; // reset TID after use
        // setTimeout(()=>{
        //   startStatusPolling();
        // },1000)
        return;
      }
    }
  }
  
    };

    ws.onerror = (err) => {
      addLog("❌ WebSocket Error");
    };

    ws.onclose = () => {
      addLog("🔌 WebSocket Disconnected — retrying in 3 sec...");
      setTimeout(connectWebSocket, 3000);
    };
  };

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // ----------------------------- Send Command via WebSocket ---------------------
  const sendCommand = async (cmd) => {
    console.log(`HB/${machineNumber.current}`, cmd);
    addLog("SEND → " + cmd,);
     const message = JSON.stringify({ topic: `HB/${machineNumberRef.current}`, payload:cmd });
    wsRef.current?.send(message);
  };

  // ----------------------------- Handle SEND Button -----------------------------
  const handleSend = async () => {
    if (!amount) return alert("Enter Amount");
    const newTid = generateTID();
    tidRef.current = newTid;

    const vendCommand = `*VEND,${newTid},PAYTM,${amount}00,${newTid}#`;
   
    await sendCommand(vendCommand);
  };

  // ----------------------------- Poll Status Every 3 Sec ------------------------
  const startStatusPolling = () => {
    if (intervalRef.current) return;

    intervalRef.current = setInterval(() => {
      sendCommand("*MVSTATUS?#");
    }, 3000);
  };

  useEffect(()=>{
    KBDKvaluesRef.current=KBDKvalues;
  },[KBDKvalues])

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <div style={{width:'100%',display:'flex',justifyContent:'center'}}>
      <div style={{ padding: 20, fontFamily: "Arial", maxWidth: 500,minWidth:400 }}>
        <h2>Payment Command UI</h2>
        <input
        type="text"
        placeholder="Enter Machine Number"
        onChange={(e) => machineNumberRef.current = e.target.value}
        // onChange={(e) => setMachineNumber(e.target.value)}
        style={{
          padding: 8,
          width: "100%",
          marginBottom: 10,
          fontSize: 16,
        }}
      />


        <input
          type="number"
          placeholder="Enter Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{
            padding: 8,
            width: "100%",
            marginBottom: 10,
            fontSize: 16,
          }}
        />
        <div>
          <strong>KBDK Values:</strong>
          <div style={{display:'flex',gap:10,marginTop:5}}>
            <div>KBD1: <input type="number" value={KBDKvalues.kbd1} onChange={(e)=>setKBDKvalues(prev=>({...prev,kbd1:Number(e.target.value)}))} style={{width:60}}/></div>
            <div>KBD2: <input type="number" value={KBDKvalues.kbd2} onChange={(e)=>setKBDKvalues(prev=>({...prev,kbd2:Number(e.target.value)}))} style={{width:60}}/></div>
            <div>KBD3: <input type="number" value={KBDKvalues.kbd3} onChange={(e)=>setKBDKvalues(prev=>({...prev,kbd3:Number(e.target.value)}))} style={{width:60}}/></div>
            <div>KBD4: <input type="number" value={KBDKvalues.kbd4} onChange={(e)=>setKBDKvalues(prev=>({...prev,kbd4:Number(e.target.value)}))} style={{width:60}}/></div>
          </div>
        </div>

        <button
          onClick={handleSend}
          style={{
            padding: "10px 20px",
            background: "#4CAF50",
            color: "white",
            border: "none",
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          SEND
        </button>

        <h3 style={{ marginTop: 20 }}>Logs</h3>
        <div
          style={{
            background: "#eee",
            padding: 10,
            height: 200,
            overflowY: "auto",
            fontSize: 14,
          }}
        >
          {log.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

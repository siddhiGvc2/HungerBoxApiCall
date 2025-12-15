import { useState, useEffect, useRef } from "react";

export default function PaymentUI() {
  const [amount, setAmount] = useState("");
  const [host,setHost]=useState("https://demo.provend.in");
  const [machineNumber, setMachineNumber] = useState("");
  const [KBDKvalues,setKBDKvalues]=useState({kbd1:10,kbd2:11,kbd3:20,kbd4:21,kbd5:28});
  const KBDKvaluesRef = useRef(KBDKvalues);
  const [log, setLog] = useState([]);

  const wsRef = useRef(null);

  const tidRef = useRef("");
  const machineNumberRef = useRef(machineNumber);

  
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



async function createOrderAndCheckWebhook(machineId, tid, amount) {
  try {
    // 1. POST ORDER API
    const postRes = await fetch(
      `${host}/api/v1/machines/${machineId}/orders`,
      {
        method: "POST",
        headers: {
          "accept": "application/json",
          "Content-Type": "application/json",
          "Api-Key": "client-hungerbox-api-key-12345",
        },
        body: JSON.stringify({
          txn_id: tid,
          amount: amount,
          items: [{"x":parseInt(KBDKvaluesRef.current.kbd1/10),'y':KBDKvaluesRef.current.kbd1%10},
                  {"x":parseInt(KBDKvaluesRef.current.kbd2/10),"y":KBDKvaluesRef.current.kbd2%10},
                  {"x":parseInt(KBDKvaluesRef.current.kbd3/10),'y':KBDKvaluesRef.current.kbd3%10},
                  {"x":parseInt(KBDKvaluesRef.current.kbd4/10),'y':KBDKvaluesRef.current.kbd4%10},
                  {"x":parseInt(KBDKvaluesRef.current.kbd5/10),'y':KBDKvaluesRef.current.kbd5%10}],
        }),
      }
    );

    const postData = await postRes.json();
    if(!postRes.ok){
     
      alert("Failed to create order: " + (postData.message || "Unknown error"));
      //  throw new Error(postData.message || "Failed to create order");
    } 
    console.log("POST Order Response:", postData);

    // 2. WAIT 10 SECONDS
    console.log("Waiting 10 seconds...");
    await new Promise((res) => setTimeout(res, 10000));

    // 3. GET WEBHOOK TEST API
    const webhookRes = await fetch(
      `${host}/api/v1/transactions/webhook-test-002`,
      {
        method: "GET",
        headers: {
          "Api-Key": "client-hungerbox-api-key-12345",
        },
      }
    );

    const webhookData = await webhookRes.json();
    console.log("GET Webhook Response:", webhookData);

    return { postData, webhookData };
  } catch (error) {
    console.error("API error:", error);
    alert("API error: " + error.message);
    return null;
  }
}



 

  // ----------------------------- Handle SEND Button -----------------------------
  const handleSend = async () => {
    if (!amount) return alert("Enter Amount");
    const newTid = generateTID();
    tidRef.current = newTid;

    createOrderAndCheckWebhook(machineNumberRef.current, newTid, amount*100)
    .then((data) => {
      console.log("Final Output:", data);
    });
   
    
  };

 

  useEffect(()=>{
    KBDKvaluesRef.current=KBDKvalues;
  },[KBDKvalues])

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <div style={{width:'100%',display:'flex',justifyContent:'center'}}>
      <div style={{ padding: 20, fontFamily: "Arial", maxWidth: 500,minWidth:350 }}>
        <h2>Payment Command UI for Provend</h2>
        <div className="select-wrapper">
      <label className="select-label">Choose API Sever</label>

      <select
        className="select-input"
        value={host}
        onChange={(e) => setHost(e.target.value)}
      >
        <option value="" disabled>
          -- Select an option --
        </option>
        <option value="https://demo.provend.in">Provend API</option>
        <option value="http://64.227.136.220:3000">GVC API</option>
       
      </select>

      {host && <p className="selected-text">Selected: {host}</p>}
    </div>
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
            <div>KBD5: <input type="number" value={KBDKvalues.kbd5} onChange={(e)=>setKBDKvalues(prev=>({...prev,kbd5:Number(e.target.value)}))} style={{width:60}}/></div>
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
        <button onClick={()=>setLog([])}>Clear Log</button>
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

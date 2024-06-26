import "dotenv/config"
import { app } from "./app.js";
import connectDb from "./db/index.js";
  
const port = 4000 || process.env.PORT
connectDb()
    .then(() => { 
        app.on("error",(err) => console.log("Error: ",err))
        app.listen(port, () => {
            console.log(`⚙️  Server running at port ${port}`);
        })
    })
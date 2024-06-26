import mongoose from "mongoose";
import "dotenv/config"
import { DB_NAME } from "../constants.js";
const connectDb = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("Error in connecting to MongoDB", error);
        process.exit(1)
    }
}

export default connectDb
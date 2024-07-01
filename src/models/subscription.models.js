import { Schema, model } from "mongoose";

const subscriptionSchema = new Schema(
    {
        subscriber: {
            type: Schema.Types.ObjectId, // who subscribes channel
            ref: "User",
        },
        channel: {
            type: Schema.Types.ObjectId, // the channel which subscriber subscribes
            ref: "User",
        },
    },
    { timestamps: true }
);

const Subscription = model("Subscription", subscriptionSchema);
export default Subscription;

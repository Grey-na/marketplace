import app from "./app/app";
import { AppConfig } from "./config/AppConfig";
import { connectDB } from "./config/Database";

const startServer = async () => {
    try{
        await connectDB()
        app.listen(AppConfig.port, () => {
            console.log(`Server running on http://localhost:${AppConfig.port}`)
        })
    }catch(exception){
        console.error("Could not start the server", exception)
        process.exit(1)
    }
}

startServer()
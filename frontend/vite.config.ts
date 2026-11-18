import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
	// BACKEND: Express listens on 3000. BACKEND_URL is server-only, loaded from .env.
	const env = loadEnv(mode, process.cwd(), "");
	const target = env.BACKEND_URL || "http://localhost:3000";
	return {
		plugins: [react()],
		server: {
			host: true,
			allowedHosts: [
				'.trycloudflare.com'
			],
			proxy: {
				"/api": { target, changeOrigin: true },
				"/uploads": { target, changeOrigin: true },
			},
		},
	};
});

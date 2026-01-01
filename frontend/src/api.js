import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const runSimulation = async (scenario, marketParams) => {
    try {
        const response = await axios.post(`${API_URL}/simulate`, {
            scenario: scenario,
            market_params: marketParams
        });
        return response.data;
    } catch (error) {
        console.error("Simulation error:", error);
        throw error;
    }
};

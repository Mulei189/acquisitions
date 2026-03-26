import express from 'express';

const app = express();

app.get('/', (req, res) => {
    res.status(200).json({ message: 'Welcome to the Acquisitions API' });
});

export default app;
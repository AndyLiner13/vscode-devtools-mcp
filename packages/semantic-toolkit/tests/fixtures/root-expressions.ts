const app = { use: (_: unknown) => {}, listen: (_: number) => {} };
const cors = () => ({});
const helmet = () => ({});

app.use(cors());
app.use(helmet());

app.listen(3000);

console.log('Server started');

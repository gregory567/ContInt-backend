const request = require('supertest');
const app = require('../app');
const db = require('../db/db');

// Mock the database methods
jest.mock('../db/db', () => {
    const mockSequelize = {
        sync: jest.fn().mockResolvedValue(),
        close: jest.fn().mockResolvedValue(),
        authenticate: jest.fn().mockResolvedValue(),
        models: {
            todo: {
                create: jest.fn(),
                findAll: jest.fn(),
                findByPk: jest.fn(),
            }
        }
    };
    return mockSequelize;
});

beforeAll(async () => {
    const mockTodos = [
        { id: 1, name: 'Initial Task 1', done: false },
        { id: 2, name: 'Initial Task 2', done: true }
    ];
    db.models.todo.create.mockResolvedValue(mockTodos[0]);
    db.models.todo.findAll.mockResolvedValue(mockTodos);
    db.models.todo.findByPk.mockImplementation(id => {
        return Promise.resolve(mockTodos.find(todo => todo.id === id));
    });
});

afterAll(async () => {
    await db.close();
});

describe('Todos API', () => {

    ///////////////////////////////////////////////////////////////////
    //////////// GET Tests /////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////

    test('GET /todos should return all todos', async () => {
        const res = await request(app).get('/todos');
        expect(res.statusCode).toEqual(200);
        expect(res.body.length).toBe(2); // Should have 2 initial tasks
    });

    test('GET /todos should return an empty array if no todos exist', async () => {
        db.models.todo.findAll.mockResolvedValueOnce([]);
        const res = await request(app).get('/todos');
        expect(res.statusCode).toEqual(200);
        expect(res.body.length).toBe(0);
    });

    test('GET /todos should return todos with the correct properties', async () => {
        const res = await request(app).get('/todos');
        expect(res.statusCode).toEqual(200);
        res.body.forEach(todo => {
            expect(todo).toHaveProperty('id');
            expect(todo).toHaveProperty('name');
            expect(todo).toHaveProperty('done');
        });
    });

    ///////////////////////////////////////////////////////////////////
    //////////// POST Tests ////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////

    test('POST /todos should create a new todo', async () => {
        const newTodo = { id: 3, name: 'New Task', done: false };
        db.models.todo.create.mockResolvedValue(newTodo);
        const res = await request(app)
            .post('/todos')
            .send({ name: 'New Task' });
        expect(res.statusCode).toEqual(201);
        expect(res.body.name).toBe('New Task');
        expect(res.body.done).toBe(false);
    });

    test('POST /todos should return validation error for empty name', async () => {
        const res = await request(app)
            .post('/todos')
            .send({ name: '' });
        expect(res.statusCode).toEqual(400);
        expect(res.body.errors[0].msg).toBe('Invalid value');
    });

    test('POST /todos should trim whitespace from name', async () => {
        const newTodo = { id: 3, name: 'Trimmed Task', done: false };
        db.models.todo.create.mockResolvedValue(newTodo);
        const res = await request(app)
            .post('/todos')
            .send({ name: '   Trimmed Task   ' });
        expect(res.statusCode).toEqual(201);
        expect(res.body.name).toBe('Trimmed Task');
    });

    test('POST /todos should handle duplicate todo names correctly', async () => {
        const existingTodo = { id: 3, name: 'Duplicate Task', done: false };
        db.models.todo.findAll.mockResolvedValueOnce([existingTodo]);
        const res = await request(app)
            .post('/todos')
            .send({ name: 'Duplicate Task' });
        expect(res.statusCode).toEqual(201);
        expect(res.body.name).toBe('Duplicate Task');
    });

    test('POST /todos should return 400 for invalid data types', async () => {
        const res = await request(app)
            .post('/todos')
            .send({ name: 123 });
        expect(res.statusCode).toEqual(400);
        expect(res.body.errors[0].msg).toBe('Invalid value');
    });

    test('POST /todos should not allow a todo with "done" status set to true initially', async () => {
        const newTodo = { id: 4, name: 'New Task', done: true };
        db.models.todo.create.mockResolvedValue(newTodo);
        const res = await request(app)
            .post('/todos')
            .send({ name: 'New Task', done: true });
        expect(res.statusCode).toEqual(201);
        expect(res.body.done).toBe(false);
    });

    ////////////////////////////////////////////////////////////////////////
    //////////// bad TODO naming ///////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    test('POST /todos should return 400 for a name exceeding max length', async () => {
        const longName = 'A'.repeat(256); // 256 characters long
        const res = await request(app).post('/todos').send({ name: longName });
        expect(res.statusCode).toEqual(400);
        expect(res.body.errors[0].msg).toBe('Invalid value');
    });

    test('POST /todos should return 400 if name is missing', async () => {
        const res = await request(app).post('/todos').send({});
        expect(res.statusCode).toEqual(400);
        expect(res.body.errors[0].msg).toBe('Invalid value');
    });

    ////////////////////////////////////////////////////////////////////////
    //////////// DB connection /////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    test('Database connection should be established', async () => {
        await expect(db.authenticate()).resolves.not.toThrow();
    });

    test('Database model should sync correctly', async () => {
        expect(db.models.todo).toBeDefined();
    });

});

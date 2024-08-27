const request = require('supertest');
const app = require('../app');
const db = require('../db/db');

jest.mock('../db/db'); // Mock the database module

const mockTodoModel = {
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findByPk: jest.fn(),
};

// Mock the database models and methods
db.models = {
    todo: mockTodoModel,
};

beforeAll(() => {
    // Seed mock data for tests
    mockTodoModel.findAll.mockResolvedValue([
        { id: 1, name: 'Initial Task 1', done: false },
        { id: 2, name: 'Initial Task 2', done: true },
    ]);

    mockTodoModel.create.mockImplementation((todo) =>
        Promise.resolve({ id: 3, ...todo, done: false })
    );

    mockTodoModel.update.mockImplementation((updates, options) => {
        if (options.where.id === 1) {
            return Promise.resolve([1]);
        } else {
            return Promise.resolve([0]);
        }
    });

    mockTodoModel.findByPk.mockImplementation((id) => {
        if (id === 1) {
            return Promise.resolve({ id: 1, name: 'Initial Task 1', done: true });
        } else if (id === 999) {
            return Promise.resolve(null);
        } else {
            return Promise.resolve(null);
        }
    });
});

afterAll(() => {
    jest.clearAllMocks();
});

describe('Todos API', () => {

    test('GET /todos should return all todos', async () => {
        const res = await request(app).get('/todos');
        expect(res.statusCode).toEqual(200);
        expect(res.body.length).toBe(2); // Should have 2 initial tasks
        expect(mockTodoModel.findAll).toHaveBeenCalledTimes(1);
    });

    test('POST /todos should create a new todo', async () => {
        const res = await request(app)
            .post('/todos')
            .send({ name: 'New Task' });
        expect(res.statusCode).toEqual(201);
        expect(res.body.name).toBe('New Task');
        expect(res.body.done).toBe(false);
        expect(mockTodoModel.create).toHaveBeenCalledWith({ name: 'New Task' });
    });

    test('POST /todos should return validation error for empty name', async () => {
        const res = await request(app)
            .post('/todos')
            .send({ name: '' });
        expect(res.statusCode).toEqual(400);
        expect(res.body.errors[0].msg).toBe('Invalid value');
    });

    test('PUT /todos/:id/done should mark a todo as done', async () => {
        const res = await request(app)
            .put('/todos/1/done');
        expect(res.statusCode).toEqual(200);
        expect(res.body.done).toBe(true);
        expect(mockTodoModel.update).toHaveBeenCalledWith(
            { done: true },
            { where: { id: 1 } }
        );
    });

    test('PUT /todos/:id/done should return 404 for a non-existent todo', async () => {
        const res = await request(app)
            .put('/todos/999/done');
        expect(res.statusCode).toEqual(404);
        expect(res.text).toBe('Todo not found');
    });

    test('DELETE /todos/:id/done should mark a todo as not done', async () => {
        const res = await request(app)
            .delete('/todos/1/done');
        expect(res.statusCode).toEqual(200);
        expect(res.body.done).toBe(false);
    });

    test('Database connection should be established', async () => {
        await expect(db.authenticate()).resolves.not.toThrow();
    });

    test('Database model should sync correctly', async () => {
        const todoModel = db.models.todo;
        expect(todoModel).toBeDefined();
    });

});

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
                update: jest.fn(),
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
    db.models.todo.update.mockImplementation((values, options) => {
        const todo = mockTodos.find(todo => todo.id === options.where.id);
        if (todo) {
            return Promise.resolve([1, [{ ...todo, ...values }]]);
        }
        return Promise.resolve([0, []]);
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

    test('POST /todos should allow a todo with "done" status set to true initially', async () => {
        const newTodo = { id: 4, name: 'New Task', done: true };
        db.models.todo.create.mockResolvedValue(newTodo);
        const res = await request(app)
            .post('/todos')
            .send({ name: 'New Task', done: true });
        expect(res.statusCode).toEqual(201);
        expect(res.body.done).toBe(true);
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
    //////////// PUT Tests /////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    /*
    test('PUT /todos/:id/done should mark a todo as done', async () => {
        const todo = { id: 1, name: 'Initial Task 1', done: false };
        db.models.todo.findByPk.mockResolvedValueOnce(todo);
        const res = await request(app).put('/todos/1/done');
        expect(res.statusCode).toEqual(200);
        expect(res.body.done).toBe(true);
    });
    */

    test('PUT /todos/:id/done should return 404 if todo is not found', async () => {
        db.models.todo.findByPk.mockResolvedValueOnce(null);
        const res = await request(app).put('/todos/999/done');
        expect(res.statusCode).toEqual(404);
        expect(res.text).toBe('Todo not found');
    });

    ////////////////////////////////////////////////////////////////////////
    //////////// DELETE Tests //////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    /*
    test('DELETE /todos/:id/done should mark a todo as not done', async () => {
        const todo = { id: 2, name: 'Initial Task 2', done: true };
        db.models.todo.findByPk.mockResolvedValueOnce(todo);
        const res = await request(app).delete('/todos/2/done');
        expect(res.statusCode).toEqual(200);
        expect(res.body.done).toBe(false);
    });
    */

    test('DELETE /todos/:id/done should return 404 if todo is not found', async () => {
        db.models.todo.findByPk.mockResolvedValueOnce(null);
        const res = await request(app).delete('/todos/999/done');
        expect(res.statusCode).toEqual(404);
        expect(res.text).toBe('Todo not found');
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



    test('should use CORS middleware with correct origin settings', async () => {
        const res = await request(app)
            .options('/todos')
            .set('Origin', 'http://44.219.67.143')
            .send();

        expect(res.headers['access-control-allow-origin']).toBe('http://44.219.67.143');
        expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    test('should not allow requests from unauthorized origins', async () => {
        const res = await request(app)
            .options('/todos')
            .set('Origin', 'http://unauthorized-origin.com')
            .send();

        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    test('should return 404 for undefined routes', async () => {
        const res = await request(app).get('/undefined-route');
        expect(res.statusCode).toEqual(404);
    });

    test('should parse cookies correctly', async () => {
        const res = await request(app)
            .get('/todos')
            .set('Cookie', 'test_cookie=test_value');

        expect(res.statusCode).toEqual(200);
        expect(res.headers['set-cookie']).toBeUndefined(); // Assuming no new cookies are set in this route
    });

});

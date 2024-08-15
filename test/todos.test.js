const request = require('supertest');
const app = require('../app');
const db = require('../db/db');

// Mock the Sequelize model and methods
jest.mock('../db/db', () => {
    const SequelizeMock = require('sequelize-mock');
    const dbMock = new SequelizeMock();

    const TodoMock = dbMock.define('todo', {
        id: 1,
        name: 'Test Todo',
        done: false,
    });

    // Mock findByPk method
    TodoMock.findByPk = jest.fn().mockImplementation((id) => {
        if (id === 1) {
            return Promise.resolve(TodoMock.build({ id: 1, name: 'Test Todo', done: false }));
        } else {
            return Promise.resolve(null); // For non-existent todos
        }
    });

    dbMock.models = {
        todo: TodoMock,
    };

    return dbMock;
});

describe('Todos API', () => {
    beforeAll(async () => {
        // No need to sync since we are using a mock database
    });

    it('should create a new todo', async () => {
        const response = await request(app)
            .post('/todos')
            .send({
                name: 'Test Todo'
            });
        expect(response.statusCode).toBe(201);
        expect(response.body.name).toBe('Test Todo');
        expect(response.body.done).toBe(false);
    });

    it('should not create a todo with an empty name', async () => {
        const response = await request(app)
            .post('/todos')
            .send({
                name: ''
            });
        expect(response.statusCode).toBe(400);
        expect(response.body.errors[0].msg).toBe('Invalid value');
    });

    it('should get all todos', async () => {
        const response = await request(app).get('/todos');
        expect(response.statusCode).toBe(200);
        expect(response.body.length).toBe(1); // There should be one todo created from the previous test
    });

    it('should mark a todo as done', async () => {
        const todoResponse = await request(app).get('/todos');
        const todoId = todoResponse.body[0].id;

        const response = await request(app)
            .put(`/todos/${todoId}/done`);
        expect(response.statusCode).toBe(200);
        expect(response.body.done).toBe(true);
    }, 10000); // Increase timeout to 10 seconds

    it('should mark a todo as undone', async () => {
        const todoResponse = await request(app).get('/todos');
        const todoId = todoResponse.body[0].id;

        const response = await request(app)
            .delete(`/todos/${todoId}/done`);
        expect(response.statusCode).toBe(200);
        expect(response.body.done).toBe(false);
    }, 10000); // Increase timeout to 10 seconds

    it('should return 404 for a non-existing todo when marking done', async () => {
        const response = await request(app)
            .put('/todos/999/done'); // Using a non-existent ID
        expect(response.statusCode).toBe(404);
    }, 10000); // Increase timeout to 10 seconds

    it('should return 404 for a non-existing todo when marking undone', async () => {
        const response = await request(app)
            .delete('/todos/999/done'); // Using a non-existent ID
        expect(response.statusCode).toBe(404);
    }, 10000); // Increase timeout to 10 seconds
});

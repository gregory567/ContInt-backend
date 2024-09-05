const { body, validationResult } = require('express-validator');
const db = require('../db/db');
var express = require('express');
var router = express.Router();
const { PostHog } = require('posthog-node');
const posthog = new PostHog(
  'phc_xC1fBU65c02AaFCisiKximyPseHTHIUGSRwtQayUXs0',
  { host: 'https://eu.i.posthog.com' }
);

// Helper function to extract distinctId from request header
function getDistinctIdFromReqHeader(req) {
    try {
        const distinctId = req.headers['x-session-id'];
        console.log("distinct_id:", distinctId);
        if (distinctId) {
            console.log("inside getDistinctIdFromReqHeader if statement");
        
            return distinctId;
        }
    } catch (error) {
        console.error('Error parsing reqHeader :', error);
    }
    return null;
}



async function processTodos(todos, distinctId) {
    const isFeatureEnabled = await posthog.isFeatureEnabled('move-unfinished-todos', distinctId);

    console.log("Feature flag enabled:", isFeatureEnabled);

    if (isFeatureEnabled) {
        return todos
            .sort((a, b) => {
                // Unfinished todos to the top
                if (!a.done && b.done) return -1;
                if (a.done && !b.done) return 1;

                // Sort by date
                return new Date(a.createdAt) - new Date(b.createdAt);
            })
            .map(todo => {
                // Update date for unfinished todos
                if (!todo.done) {
                    todo.date = new Date(new Date().setDate(new Date().getDate() + 1));
                }
                return todo;
            });
    }

    return todos;
}
// Read all todos
router.get('/', async (req, res, next) => {
    
    try {
        const todos = await db.models.todo.findAll();
        const distinctId = getDistinctIdFromReqHeader(req);
        if (distinctId) {
            const sortedTodos = await processTodos(todos, distinctId);
            return res.status(200).json(sortedTodos);
        } else {
            console.log("inside get route but no distinct id");
            return res.status(200).json(todos);
        }
    } catch (error) {
        next(error);
    }
});

// Create todos
router.post('/',
    body('name').not().isEmpty(),
    body('name').isLength({ max: 255 }),
    async (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            let todo = await db.models.todo.create({
                name: req.body.name,
                done: false,
                date: new Date()
            });

            const distinctId = getDistinctIdFromReqHeader(req);
            if (distinctId) {
                const isFeatureEnabled = await posthog.isFeatureEnabled('move-unfinished-todos', distinctId);
                if (isFeatureEnabled) {
                    todo.date = new Date(new Date().setDate(new Date().getDate() + 1));
                    todo = await todo.save();
                }
            }
            res.status(201).json(todo);
        } catch (error) {
            next(error);
        }
    });

// Update todos with done
router.put('/:id/done', async (req, res, next) => {
    try {
        const pk = req.params.id;
        let todo = await db.models.todo.findByPk(pk);
        if (null == todo) {
            return res.status(404).send('Todo not found');
        }
        todo = await todo.update({ done: true });
        res.status(200).json(todo);
    } catch (error) {
        next(error);
    }
});

// Update todos with undone
router.delete('/:id/done', async (req, res, next) => {
    try {
        const pk = req.params.id;
        let todo = await db.models.todo.findByPk(pk);
        if (null == todo) {
            return res.status(404).send('Todo not found');
        }
        todo = await todo.update({ done: false });
        res.status(200).json(todo);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
const express = require('express')
const app = express()
app.use(express.json())
const { v4: uuidv4 } = require('uuid')

const customers = []

// Middleware
function verifyIfExistsAccountCPF(request, response, next) {
	const { cpf } = request.headers
	const customer = customers.find((customer) => customer.cpf === cpf)
	if (!customer) return response.status(400).json({ error: "Customer not found." })
	request.customer = customer
	return next()
}

function getBalance(statement) {
	return statement.reduce((acc, operation) => {
		if (operation.type === 'credit') {
			return acc + operation.ammount
		} else if (operation.type === 'debit') {
			return acc - operation.ammount
		}
	}, 0)
}

function formatDate(date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')
		}-${date.getDate()} `
}

app.post('/account', (request, response) => {
	const accData = request.body.data
	accData.id = uuidv4()
	accData.statement = []
	customers.push(accData)
	response.status(201).send()
})

app.get('/statement', verifyIfExistsAccountCPF, (request, response) => {
	const customer = request.customer
	response.status(200).json({ statement: customer.statement })
})

app.get('/statement/date', verifyIfExistsAccountCPF, (request, response) => {
	const customer = request.customer
	const { date } = request.query
	const dateFormat = new Date(date + " 00:00:00").toDateString()
	const statement = customer.statement.filter((operation) => {
		const operationDate = operation.created_at.toDateString()
		return operationDate === dateFormat
	})
	response.status(200).json(statement)
})

app.post('/deposit', verifyIfExistsAccountCPF, (request, response) => {
	const { description, amount } = request.body
	const { customer } = request
	const statementOperation = {
		description,
		amount,
		created_at: new Date(),
		type: "credit"
	}
	customer.statement.push(statementOperation)
	return response.status(201).send({ statement: statementOperation })
})

app.post('/withdraw', verifyIfExistsAccountCPF, (request, response) => {
	const { amount } = request.body
	const { customer } = request
	const balance = getBalance(customer.statement)
	if (balance < amount) return response.status(400).json({ error: "Insufficient founds." })

	const statementOperation = {
		amount,
		created_at: new Date(),
		type: "debit"
	}
	customer.statement.push(statementOperation)
	return response.status(201).send({ statement: statementOperation })
})

app.put('/account', verifyIfExistsAccountCPF, (request, response) => {
	const { name, cpf } = request.body.data
	const { customer } = request
	customer.name = name
	customer.cpf = cpf
	return response.status(200).json(customer)
})

app.get('/account', verifyIfExistsAccountCPF, (request, response) => {
	const { customer } = request
	return response.status(200).json(customer)
})

app.delete('/account', verifyIfExistsAccountCPF, (request, response) => {
	const { customer } = request
	customers.splice(customer, 1)
	return response.status(200).json({ customers })
})

app.listen(3333, console.log('listening...'))
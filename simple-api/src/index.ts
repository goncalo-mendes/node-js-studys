import express, { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();

app.use(express.json());

/**
* nif - string
* name - string
* id - uuid
* statement - array string
*/

interface ICustomers {
  nif: string,
  name: string,
  id: string,
  statement: []
}

interface IUserRequest extends Request {
  customer?: any
}

const customers: ICustomers[] = [];


function verifyIfExistesAccount(req: IUserRequest, res: Response, next: NextFunction) {
  const { nif } = req.headers;

  const customer = customers.find(customer => customer.nif === nif);

  if (!customer) {
    return res.status(400).json({ error: "User not found" });;
  }

  req.customer = customer;

  return next();
}

function GetBalance(statement: any) {
  const balance = statement.reduce((acc: any, operation: any) => {
    if (operation.type === 'credit') {
      return acc + operation.amount;
    } else {
      return acc - operation.amount;
    }
  }, 0);

  return balance

}

app.post("/account", (request, response) => {
  const { nif, name } = request.body;

  const customerAlreadyExists = customers.some(
    (customer: any) => customer.nif === nif
  );

  if (customerAlreadyExists) {
    return response.status(400).json({ error: "Customer already exists" });
  }

  customers.push({
    nif,
    name,
    id: uuidv4(),
    statement: []
  });

  return response.status(201).json({ sucess: "User was added" })
})

app.put("/account", verifyIfExistesAccount, (req: IUserRequest, res: Response) => {
  const { name } = req.body;
  const customer = req.customer;

  customer.name = name;

  return res.status(201).json({ sucess: "User was updated" })
})

app.get("/account", verifyIfExistesAccount, (req: IUserRequest, res: Response) => {
  const customer = req.customer;

  return res.status(200).json(customer)
})

app.delete("/account", verifyIfExistesAccount, (req: IUserRequest, res: Response) => {
  const customer = req.customer;

  customers.splice(customer, 1)

  return res.status(204).json({ sucess: "User was deleted" })
})

app.get("/statement", verifyIfExistesAccount, (req: any, res: Response) => {
  const customer = req.customer;
  return res.status(200).json(customer?.statement);
})

app.get("/statement/date", verifyIfExistesAccount,
  (req: any, res: Response) => {
    const customer = req.customer;
    const { date } = req.query;

    const dateFormat = new Date(date + " 00:00");

    const statement = customer.statement.filter(
      (statement: any) =>
        statement.created_at.toDateString() === new Date(dateFormat).toDateString())

    return res.status(200).json(statement);
  })

app.post("/deposit", verifyIfExistesAccount, (req: any, res: Response) => {
  const { description, amount } = req.body;
  const customer = req.customer;
  const statemenOperaion = {
    description,
    amount,
    created_at: new Date(),
    type: "credit"
  }

  customer.statement.push(statemenOperaion);

  return res.status(200).json({ sucess: "statement was added", statement: customer.statement });
})

app.post("/withdraw", verifyIfExistesAccount, (req: any, res: Response) => {
  const { amount } = req.body;
  const customer = req.customer;

  const balance = GetBalance(customer.statement);

  if (balance < amount) {
    return res.status(400).json({ error: 'insufficient balance' })
  }

  const statementOperaion = {
    amount,
    created_at: new Date(),
    type: 'debit'
  };

  customer.statemente.push(statementOperaion)

  return res.status(201).send()
})

app.get("/balance", verifyIfExistesAccount, (req: any, res: Response) => {
  const customer = req.customer;

  const balance = GetBalance(customer.statement);

  return res.json(balance);
})

app.listen(8080, () => console.log("server up"));

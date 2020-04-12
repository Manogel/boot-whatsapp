const app = require('express')();
const bodyParser = require('body-parser');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const ngrok = require('ngrok');

const porta = 3340;

const api = require('./api');

async function ativarNgrok() {
  const url = await ngrok.connect(porta);
  return console.log(url);
}
ativarNgrok();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.io = io;

app.io.on('connection', (socket) => {
  console.log(`Socket conectado ${socket.id}`);
  socket.on('sendMsg', (data) => {
    console.log(data);
    socket.broadcast.emit('receivedMsg', data);
  });
});

//  100 - Iniciou a conversa
//  101 - Solicitou o cardapio
//  200 - iniciou o pedido
//  300 - confirmacao do pedido
//  400 - confirma endereco de entrega
//  500 - confirma pagamento
//  600 - finalizar pedido

let clients = [];

const cardapios = [
  {
    id: '1',
    name: 'Pizza',
    price: 12.99,
  },
  {
    id: '2',
    name: 'Hamburguer',
    price: 10.99,
  },
  {
    id: '3',
    name: 'Sobremesas',
    price: 8.99,
  },
];

let stringCardapio = 'Aqui esta as informações de nosso cardapio: \n';

cardapios.forEach(({ id, name, price }) => { stringCardapio += `\n*${id} -* ${name} | R$ ${price} \n`; });

stringCardapio += '\n\nPara começar a montar seu pedido digite *2* ou *fim* para finalizar o atendimento!';

const textWellcome = `
    Olá bem vindo ao sistema de autoatendimento,

    *1 -* Receber o cardápio

    *2 -* Começar o pedido

    *3 -* Ver o andamento do pedido
    \nDigite *fim* a qualquer momento para cancelar tudo.
    `.trim();

const messageError = 'Não conseguimos ler sua mensagem, tente novamente ou informe *0* para voltar ao menu principal';

app.post('/webhook', async (req, res) => {
  const json = req.body;
  console.log(json.messages[0]);
  const {
    body,
    chatId,
    type,
    senderName,
    author,
    fromMe,
  } = json.messages[0];

  console.log(clients);

  const numberClient = chatId.split('@')[0];
  const messageClient = body.trim();

  const client = clients.find(({ chatId: clientId }) => clientId === chatId);

  if (!fromMe && type === 'chat') {
    if (!client) {
      api.post('/sendMessage?token=z4cwy6afeqghg3v9', {
        phone: numberClient,
        body: textWellcome,
      });
      clients = [...clients, {
        status: 100,
        chatId,
        senderName,
        author,
        phone: numberClient,
        lastMessage_at: new Date(),
      }];
    } else if (client.status === 100 && messageClient === '1') {
      api.post('/sendMessage?token=z4cwy6afeqghg3v9', {
        phone: numberClient,
        body: stringCardapio,
      });
      const data = {
        status: 101,
        chatId,
        senderName,
        author,
        phone: numberClient,
        lastMessage_at: new Date(),
      };
      clients = clients.map((c) => (c.chatId === client.chatId ? data : c));
    } else if (client && messageClient === '0') {
      api.post('/sendMessage?token=z4cwy6afeqghg3v9', {
        phone: numberClient,
        body: textWellcome,
      });
      const data = {
        status: 100,
        chatId,
        senderName,
        author,
        phone: numberClient,
        lastMessage_at: new Date(),
      };
      clients = clients.map((c) => (c.chatId === client.chatId ? data : c));
    } else {
      api.post('/sendMessage?token=z4cwy6afeqghg3v9', {
        phone: numberClient,
        body: messageError,
      });
    }
  }

  return res.send('Ok');
});

server.listen(porta);

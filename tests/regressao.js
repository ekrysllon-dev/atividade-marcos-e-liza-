import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: { checks: ['rate==1.00'] },
};

const BASE = 'http://localhost:3000/api';
const H = { headers: { 'Content-Type': 'application/json' } };

export default function () {
  const ts = Date.now();
  const post = (url, body) => http.post(`${BASE}${url}`, JSON.stringify(body), H);

  check(post('/cadastro', { nome: 'Menor', dataNascimento: '2016-05-10', user: `m_${ts}`, email: `m_${ts}@t.com`, senha: '123456', confirmarSenha: '123456' }), { 'REG-01: Bloqueia menor 14 anos (400)': (r) => r.status === 400 });
  check(post('/cadastro', { nome: 'Davi 123', dataNascimento: '2004-05-10', user: `n_${ts}`, email: `n_${ts}@t.com`, senha: '123456', confirmarSenha: '123456' }), { 'REG-02: Bloqueia numero no nome (400)': (r) => r.status === 400 });
  check(post('/cadastro', { nome: 'Davi Silva', dataNascimento: '2004-05-10', user: 'com espaco', email: `e_${ts}@t.com`, senha: '123456', confirmarSenha: '123456' }), { 'REG-03: Bloqueia espaco no user (400)': (r) => r.status === 400 });
  check(post('/cadastro', { nome: 'Davi Silva', dataNascimento: '2004-05-10', user: `i_${ts}`, email: 'semarroba', senha: '123456', confirmarSenha: '123456' }), { 'REG-04: Bloqueia email invalido (400)': (r) => r.status === 400 });
  check(post('/cadastro', { nome: 'Davi Silva', dataNascimento: '2004-05-10', user: `c_${ts}`, email: `c_${ts}@t.com`, senha: '123', confirmarSenha: '123' }), { 'REG-05: Bloqueia senha < 6 chars (400)': (r) => r.status === 400 });
  check(post('/cadastro', { nome: 'Davi Silva', dataNascimento: '2004-05-10', user: `d_${ts}`, email: `d_${ts}@t.com`, senha: '123456', confirmarSenha: '654321' }), { 'REG-06: Bloqueia senha divergente (400)': (r) => r.status === 400 });
  const uA = `alfa_${ts}`, eA = `alfa_${ts}@t.com`;
  const cadA = post('/cadastro', { nome: 'Usuario Alfa', dataNascimento: '2002-08-20', user: uA, email: eA, senha: '123456', confirmarSenha: '123456' });
  check(cadA, { 'REG-07: Cria Usuario A (201)': (r) => r.status === 201 });
  const idA = cadA.json('id');

  check(post('/cadastro', { nome: 'Outro', dataNascimento: '2000-01-01', user: uA, email: eA, senha: '123456', confirmarSenha: '123456' }), { 'REG-08: Bloqueia duplicado (409)': (r) => r.status === 409 });

  const idB = post('/cadastro', { nome: 'Usuario Beta', dataNascimento: '2001-03-15', user: `beta_${ts}`, email: `beta_${ts}@t.com`, senha: '123456', confirmarSenha: '123456' }).json('id');

  check(post('/login', { login: uA, senha: 'errada' }), { 'REG-09: Bloqueia senha errada (401)': (r) => r.status === 401 });
  check(post('/login', { login: uA, senha: '123456' }), { 'REG-10: Login por user (200)': (r) => r.status === 200 && r.json('id') === idA });
  check(post('/login', { login: eA, senha: '123456' }), { 'REG-11: Login por email (200)': (r) => r.status === 200 && r.json('id') === idA });

  check(http.get(`${BASE}/treinos`), { 'REG-12: Bloqueia GET sem usuarioId (400)': (r) => r.status === 400 });

  const musc = post('/treinos', { nome: 'Supino', tipo: 'musculacao', usuarioId: idA, series: [{ repeticoes: 10, carga: 40 }] });
  check(musc, { 'REG-13: Cria musculacao (201)': (r) => r.status === 201 });
  check(post('/treinos', { nome: 'Corrida', tipo: 'cardio', duracao: 40, distancia: 6.5, usuarioId: idA }), { 'REG-14: Cria cardio (201)': (r) => r.status === 201 });
  check(post('/treinos', { nome: 'Mobilidade', tipo: 'alongamento', usuarioId: idA, series: [{ repeticoes: 3, carga: 0 }] }), { 'REG-15: Cria alongamento (201)': (r) => r.status === 201 });

  check(http.get(`${BASE}/treinos?usuarioId=${idA}`), { 'REG-16: Usuario A lista 3 treinos': (r) => r.status === 200 && r.json().length === 3 });
  check(http.get(`${BASE}/treinos?usuarioId=${idB}`), { 'REG-17: Isolamento Usuario B (0 treinos)': (r) => r.status === 200 && r.json().length === 0 });

  check(http.del(`${BASE}/treinos/${musc.json('id')}`), { 'REG-18: Exclui treino (204)': (r) => r.status === 204 });
  check(http.del(`${BASE}/treinos/99999999`), { 'REG-19: Excluir inexistente (404)': (r) => r.status === 404 });
}

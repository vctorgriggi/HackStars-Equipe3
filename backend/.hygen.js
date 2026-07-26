const inflection = require('inflection');

/**
 * O `h.inflection` que o hygen injeta nos templates pluraliza em INGLES.
 * Como o dominio aqui e em portugues (SPEC.md/CLAUDE.md), ele produzia pastas
 * e rotas erradas — `transformadors`, `evento-passagems`, `campo-conferidos`.
 * Estas regras irregulares corrigem a pluralizacao no unico ponto por onde
 * TODOS os templates passam, entao `generate:resource:relational` e
 * `add:property:to-relational` continuam achando as pastas reais.
 *
 * Ao criar uma entidade nova de dominio, ACRESCENTE o par aqui ANTES de rodar
 * o generator — senao ele cria a pasta com o plural ingles de novo.
 * Par = [singular PascalCase, plural PascalCase]; o plural e a base da pasta,
 * do nome de arquivo, da rota e das classes Service/Controller/Module.
 */
const PLURAIS_IRREGULARES = [
  ['Transformador', 'Transformadores'],
  ['Conferencia', 'Conferencias'],
  ['CampoConferido', 'CamposConferidos'],
  ['FotoEvidencia', 'FotosEvidencia'],
  ['ProjetoModelo', 'ProjetosModelo'],
  ['Passagem', 'Passagens'],
  // Coincide com o plural ingles, mas fica registrado (regra do CLAUDE.md).
  ['Camera', 'Cameras'],
];

const chave = (str) =>
  String(str)
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

const plurais = new Map();
const singulares = new Map();
for (const [singular, plural] of PLURAIS_IRREGULARES) {
  plurais.set(chave(singular), plural);
  singulares.set(chave(plural), singular);
}

// Os templates chamam pluralize com PascalCase (`Transformador`) e com a forma
// ja em minuscula; devolver sempre PascalCase quebraria nomes de variavel,
// entao a caixa da entrada e preservada.
const aplicarCaixa = (entrada, saida) =>
  /^[a-z]/.test(entrada)
    ? saida.charAt(0).toLowerCase() + saida.slice(1)
    : saida;

const pluralize = (str, plural) => {
  if (plural) return inflection.pluralize(str, plural);
  const irregular = plurais.get(chave(str));
  return irregular ? aplicarCaixa(str, irregular) : inflection.pluralize(str);
};

const singularize = (str, singular) => {
  if (singular) return inflection.singularize(str, singular);
  const irregular = singulares.get(chave(str));
  return irregular ? aplicarCaixa(str, irregular) : inflection.singularize(str);
};

// `inflection.transform` despacha para o objeto INTERNO do pacote, entao
// sobrescrever pluralize/singularize sozinho nao teria efeito nos ~200 usos de
// transform nos templates: e preciso reimplementar o despacho sobre o wrapper.
const inflectionPtBr = Object.assign({}, inflection, {
  pluralize,
  singularize,
  transform: (str, metodos) =>
    (metodos || []).reduce(
      (acc, metodo) =>
        typeof inflectionPtBr[metodo] === 'function'
          ? inflectionPtBr[metodo](acc)
          : acc,
      str,
    ),
});

module.exports = {
  templates: `${__dirname}/.hygen`,
  // hygen mescla isto em `h` (node_modules/hygen/dist/context.js), sobrescrevendo
  // o `h.inflection` padrao para todos os templates de uma vez.
  helpers: {
    inflection: inflectionPtBr,
  },
};

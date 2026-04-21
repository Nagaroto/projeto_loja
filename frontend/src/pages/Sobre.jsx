import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Users, Leaf, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import cereonImg from '../imgs/cereon.webp';

export function Sobre() {
  const { isDark } = useTheme();
  const values = [
    {
      icon: Heart,
      title: 'Paixão por Moda',
      description: 'Acreditamos que a moda é uma forma de expressão pessoal única e especial.'
    },
    {
      icon: Leaf,
      title: 'Sustentabilidade',
      description: 'Compromisso com práticas ecológicas e produção responsável.'
    },
    {
      icon: Users,
      title: 'Comunidade',
      description: 'Criamos conexões entre pessoas que compartilham o mesmo estilo.'
    },
    {
      icon: Zap,
      title: 'Inovação',
      description: 'Sempre buscando novas tendências e tecnologias na moda.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className={`${isDark ? 'bg-cereon-green/20' : 'bg-gradient-to-r from-cereon-green to-green-400'} text-white py-20`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Sobre Cereon
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Mais que uma loja, somos um movimento de moda consciente e estilo autêntico
            </p>
          </motion.div>
        </div>
      </section>

      {/* Nossa História */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Texto */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <h2 className="text-4xl font-bold text-cereon-dark">Nossa História</h2>
              <p className="text-gray-600 leading-relaxed text-lg">
                Cereon nasceu de um sonho simples: democratizar a moda de qualidade. Começamos em 2020 com uma missão clara de criar peças que não apenas fossem bonitas, mas também sustentáveis e acessíveis.
              </p>
              <p className="text-gray-600 leading-relaxed text-lg">
                Cada coleção é desenvolvida com cuidado, considerando o impacto ambiental e social. Nossos designers trabalham com os melhores fornecedores, garantindo qualidade premium em cada produto.
              </p>
              <p className="text-gray-600 leading-relaxed text-lg">
                Hoje, somos uma marca confiada por milhares de clientes que entendem que moda é mais que usar roupa, é uma declaração de quem você é.
              </p>
            </motion.div>

            {/* Imagem */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <img
                src={cereonImg}
                alt="Nossa história"
                className="rounded-lg shadow-lg w-full"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Nossos Valores */}
      <section className="py-20 bg-cereon-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-cereon-dark mb-4">
              Nossos Valores
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              O coração de Cereon bate em torno destes princípios fundamentais
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => {
              const IconComponent = value.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                  className="bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 text-center"
                >
                  <div className="mb-4 inline-flex p-4 bg-cereon-green/10 rounded-full">
                    <IconComponent size={32} className="text-cereon-green" />
                  </div>
                  <h3 className="text-xl font-bold text-cereon-dark mb-3">
                    {value.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {value.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Estatísticas */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-5xl font-bold text-cereon-green mb-2">50K+</p>
              <p className="text-xl text-gray-600 font-semibold">Clientes Felizes</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.6 }}
            >
              <p className="text-5xl font-bold text-cereon-green mb-2">500+</p>
              <p className="text-xl text-gray-600 font-semibold">Produtos Premium</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <p className="text-5xl font-bold text-cereon-green mb-2">100%</p>
              <p className="text-xl text-gray-600 font-semibold">Satisfação Garantida</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={`py-20 ${isDark ? 'bg-cereon-green/20' : 'bg-gradient-to-r from-cereon-green to-green-400'} text-white`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold mb-6">
              Pronto para fazer parte da Cereon?
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Descubra nossas coleções exclusivas e junte-se a uma comunidade de pessoas que amam moda de qualidade.
            </p>
            <a
              href="/catalogo"
              className="inline-block px-8 py-4 bg-white text-cereon-green font-bold rounded-lg hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl"
            >
              Explorar Catálogo
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

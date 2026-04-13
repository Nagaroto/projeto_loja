import React from 'react';
import { Award, Leaf, Sparkles, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export function WhyChoose() {
  const reasons = [
    {
      icon: Award,
      title: 'Qualidade Premium',
      description: 'Tecidos selecionados e acabamento impecável em todas as peças'
    },
    {
      icon: Leaf,
      title: 'Sustentabilidade',
      description: 'Compromissado com práticas eco-friendly e responsabilidade social'
    },
    {
      icon: Sparkles,
      title: 'Design Exclusivo',
      description: 'Coleções únicas criadas por designers renomados'
    },
    {
      icon: Zap,
      title: 'Entrega Rápida',
      description: 'Frete rápido e seguro para todo o Brasil'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <section className="py-20 bg-cereon-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Título */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-cereon-dark mb-4">
            Por Que Escolher Cereon?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Somos mais que uma loja, somos um estilo de vida baseado em qualidade, inovação e consciência.
          </p>
        </motion.div>

        {/* Grid de Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {reasons.map((reason, index) => {
            const IconComponent = reason.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 text-center group"
              >
                <div className="mb-4 inline-flex p-4 bg-cereon-green/10 rounded-full group-hover:bg-cereon-green/20 transition-colors">
                  <IconComponent
                    size={32}
                    className="text-cereon-green group-hover:scale-110 transition-transform"
                  />
                </div>
                <h3 className="text-xl font-bold text-cereon-dark mb-3">
                  {reason.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {reason.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

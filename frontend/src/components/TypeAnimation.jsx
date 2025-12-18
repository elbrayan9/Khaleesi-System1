import React from 'react';
import { motion } from 'framer-motion';
import { TypeAnimation as ReactTypeAnimation } from 'react-type-animation';
import { cn } from '../lib/utils';

const TypeAnimation = ({
  words = [' existence', ' reality', ' the Internet'],
  className,
  typingSpeed = 50,
  deletingSpeed = 50,
  pauseDuration = 1000,
  gradientFrom = 'blue-500',
  gradientTo = 'purple-600',
}) => {
  const sequence = words.flatMap((word) => [word, pauseDuration]);

  return (
    <motion.span
      className={cn(
        `bg-gradient-to-r bg-clip-text text-transparent from-${gradientFrom} to-${gradientTo}`,
        className,
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <ReactTypeAnimation
        sequence={sequence}
        wrapper="span"
        repeat={Infinity}
        className=""
        speed={typingSpeed}
        deletionSpeed={deletingSpeed}
      />
    </motion.span>
  );
};

export default TypeAnimation;

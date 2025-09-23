// app/page.jsx
'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';

const systemMessage = {
  id: 'system-prompt',
  role: 'system',
  content: `
    Eres un asistente virtual de turismo experto en la provincia de Tucumán, Argentina.
    Puedes proporcionar información sobre atracciones, transportes, hoteles y alojamiento, alquiler de autos, prestadores de servicios, y artículos de interés.
    Si la persona pregunta algo relacionado a informacion, planear, ayuda, conocer, etc. es necesario que busques sobre artículos.
    buscar algo relacionado a autos es necesario que busques sobre el alquiler de autos. 
    buscar algo relacionado a actividades o turismo aventura es necesario que busques sobre prestadores de servicios.
    buscar sobre alojamiento o hoteles es necesario que busques sobre hoteles.
    buscar sobre viajes guiados, tours o guias turisticos es necesario que busques sobre guías.
    buscar sobre transporte, paradas, viajes, mediso de transporte, colectivos, como llegar a la ciudad, etc. es necesario que busques sobre transporte.
  `,
};

export default function Chat() {
  const [input, setInput] = useState(''); 

  // --- LÓGICA DE ANÁLISIS (CORREGIDA) ---
  const checkForEmptyToolOutputs = async (message) => {
    if (message.role !== 'assistant') {
      return;
    }
    console.log("Analizando la respuesta final del asistente...");
    console.log("Mensaje completo:", message);
    
    // Verificar si el mensaje tiene parts
    if (!message.parts || !Array.isArray(message.parts)) {
      console.log("El mensaje no tiene parts o no es un array");
      return;
    }
    
    // Buscar tool calls con resultados vacíos
    const emptyToolCalls = [];
    
    message.parts.forEach((part, index) => {
      console.log(`Analizando part ${index}:`, part);
      
      // Verificar tool calls
      if (part.type?.includes('tool-') && part.type !== 'step-start') {
        console.log('Tool call encontrado:', part);
        
        // Verificar si existe el resultado/output
        const result = part.output || part.result;
        
        if (result != null) {
          // Comprobamos si el resultado es un array vacío
          if (Array.isArray(result) && result.length === 0) {
            console.log('-------------------------------------------');
            console.log('¡SALIDA DE HERRAMIENTA VACÍA DETECTADA!');
            console.log('Nombre de la Herramienta:', part.type);
            console.log('Argumentos utilizados:', part.input);
            console.log('-------------------------------------------');
            
            emptyToolCalls.push({
              toolName: part.type,
              input: part.input,
              toolCallId: part.toolCallId
            });
          }
        }
      }
    });

    // Si hay tool calls vacías, hacer la llamada al endpoint fail
    if (emptyToolCalls.length > 0) {
      await handleFailedSearch(emptyToolCalls);
    }
  };

  // Función para manejar las búsquedas fallidas
  const handleFailedSearch = async (emptyToolCalls) => {
    console.log('Llamando a la API /api/fail...');
    
    try {
      // Preparar los mensajes para el endpoint fail
      // Incluir el contexto de la conversación actual
      const messagesForFail = [
        ...messages, // Incluir toda la conversación
        {
          role: 'user',
          parts: [{
            type: 'text',
            text: `Las siguientes herramientas no devolvieron resultados: ${emptyToolCalls.map(tc => tc.toolName).join(', ')}. Por favor, proporciona información alternativa o sugerencias útiles.`
          }]
        }
      ];

      const response = await fetch('/api/fail', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messages: messagesForFail
        }),
      });

      if (!response.ok) {
        throw new Error(`Error en la API fail: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No hay body en la respuesta');
      }

      // Leer el stream de respuesta
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let accumulatedText = '';
      let messageId = `fail-${Date.now()}`;

      // Añadir mensaje inicial del asistente
      setMessages(prevMessages => [
        ...prevMessages,
        {
          id: messageId,
          role: 'assistant',
          parts: [{ type: 'text', text: '' }]
        }
      ]);

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (line.startsWith('0:')) {
              try {
                const content = JSON.parse(line.slice(2));
                if (typeof content === 'string') {
                  accumulatedText += content;
                  
                  // Actualizar el mensaje en tiempo real
                  setMessages(prevMessages => 
                    prevMessages.map(msg => 
                      msg.id === messageId 
                        ? {
                            ...msg,
                            parts: [{ type: 'text', text: accumulatedText }]
                          }
                        : msg
                    )
                  );
                }
              } catch (parseError) {
                console.warn('Error parseando chunk:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      console.log('✅ Respuesta fallback añadida exitosamente');

    } catch (error) {
      console.error("Error en handleFailedSearch:", error);
      
      // Añadir mensaje de error
      setMessages(prevMessages => [
        ...prevMessages,
        {
          id: `fail-error-${Date.now()}`,
          role: 'assistant',
          parts: [{
            type: 'text',
            text: 'Lo siento, no pude encontrar resultados para tu búsqueda y hubo un problema al intentar generar una respuesta alternativa. Por favor, intenta reformular tu consulta.'
          }]
        }
      ]);
    }
  };

  // Hook useChat con acceso a setMessages
  const { messages, sendMessage, setMessages } = useChat({
    api: '/api/chat',
    // initialMessages: [systemMessage],
    onFinish: async (options) => {
      console.log("✅ Proceso completado en el FRONTEND.");
      console.log("Opciones recibidas:", options);
      
      if (options && options.message) {
        await checkForEmptyToolOutputs(options.message);
      } else {
        console.warn("No se recibió un mensaje válido en onFinish");
      }
    },
    onError: (e) => {
      console.error("❌ Error en el frontend:", e);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    console.log("Mensajes actuales:", messages);

    sendMessage({
      role: 'user',
      parts: [{ type: 'text', text: input }],
    });
    setInput('');
  };

  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {messages.map(message => (
        <div key={message.id} className="whitespace-pre-wrap my-2">
          <strong>{message.role === 'user' ? 'Tú: ' : 'IA: '}</strong>
          {message.parts.map((part, i) => {
            switch (part.type) {
              case 'text':
                return <div key={`${message.id}-${i}`}>{part.text}</div>;

              case "step-start":
                return

              // --- RENDERIZADO PARA ARTÍCULOS ---
              case 'tool-ConsultarArticulos':
                return (
                  <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
                    <p className="font-semibold mb-2">Aquí tienes algunos artículos relacionados:</p>
                    {Array.isArray(part.output) && part.output.length > 0 ? (
                      part.output.map(articulo => (
                        <div key={articulo.idArticulo} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
                          <p><strong>📝 {articulo.nombre}</strong></p>
                          <p className="text-zinc-600 dark:text-zinc-400 mt-1">{articulo.copete}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-zinc-500">No se encontraron artículos con esos criterios.</p>
                    )}
                  </div>
                );

              // --- RENDERIZADO PARA PRESTADORES ---
              case 'tool-ConsultarPrestadores':
                return (
                  <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
                    <p className="font-semibold mb-2">Encontré estos prestadores:</p>
                    {Array.isArray(part.output) && part.output.length > 0 ? (
                      part.output.map(prestador => (
                        <div key={prestador.id} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
                          <p><strong>⭐ Título:</strong> {prestador.titulo}</p>
                          <p><strong>🏞️ Actividades:</strong> {prestador.nombres_actividades}</p>
                          <p><strong>👤 Responsable:</strong> {prestador.responsable}</p>
                          <p><strong>📞 Teléfono:</strong> {prestador.telefono_final}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-zinc-500">No se encontraron prestadores con esos criterios.</p>
                    )}
                  </div>
                );

              // --- RENDERIZADO PARA GUÍAS ---
              case 'tool-ConsultarGuias':
                return (
                  <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
                    <p className="font-semibold mb-2">Estos son los guías que encontré:</p>
                    {Array.isArray(part.output) && part.output.length > 0 ? (
                      part.output.map(guia => (
                        <div key={guia.id} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
                          <p><strong>👤 {guia.nombre}</strong></p>
                          <p className="mt-1"><strong>📜 Licencia:</strong> {guia.tipo_registro}</p>
                          <p><strong>🗺️ Opera en:</strong> {guia.zona_operacion}</p>
                          <p><strong>📞 Contacto:</strong> {guia.telefonos || 'No disponible'}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-zinc-500">No se encontraron guías con esos criterios.</p>
                    )}
                  </div>
                );

              // --- RENDERIZADO PARA AUTOS ---
              case 'tool-ConsultCars':
                return (
                  <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
                    <p className="font-semibold mb-2">Resultados de la búsqueda de autos:</p>
                    {Array.isArray(part.output) && part.output.length > 0 ? (
                      part.output.map(agencia => (
                        <div key={agencia.id} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
                          <p><strong>🏢 Nombre:</strong> {agencia.nombre}</p>
                          <p><strong>📍 Dirección:</strong> {agencia.direccion}</p>
                          <p><strong>📞 Teléfono:</strong> {agencia.telefonos}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-zinc-500">No se encontraron agencias con esos criterios.</p>
                    )}
                  </div>
                );

              // --- RENDERIZADO PARA COLECTIVOS ---
              case 'tool-ConsultarColectivos':
                return (
                  <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
                    <p className="font-semibold mb-2">Aquí están los itinerarios de colectivos:</p>
                    {Array.isArray(part.output) && part.output.length > 0 ? (
                      part.output.map(itinerario => (
                        <div key={itinerario.Idtiene} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
                          <p><strong>🚌 {itinerario.Empresa}</strong> a <strong>{itinerario.nombre_localidad}</strong></p>
                          <p className="mt-1"><strong>🗓️ Días:</strong> {itinerario.dia}</p>
                          <p><strong>➡️ Horarios Ida:</strong> {itinerario.ida.replaceAll(',', ' - ')}</p>
                          <p><strong>⬅️ Horarios Vuelta:</strong> {itinerario.vuelta.replaceAll(',', ' - ')}</p>
                          <p><strong>📍 Plataforma:</strong> {itinerario.Plataforma}</p>
                          <p><strong>💲 Precio:</strong> {itinerario.Precio}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-zinc-500">No se encontraron itinerarios con esos criterios.</p>
                    )}
                  </div>
                );

              // --- RENDERIZADO PARA HOTELES ---
              case 'tool-ConsultarHoteles':
                return (
                  <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
                    <p className="font-semibold mb-2">He encontrado estos hoteles:</p>
                    {Array.isArray(part.output) && part.output.length > 0 ? (
                      part.output.map(hotel => (
                        <div key={hotel.id} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
                          <p><strong>🏨 {hotel.nombre}</strong></p>
                          <p className="mt-1">
                            <strong>⭐ Estrellas:</strong> {'★'.repeat(parseInt(hotel.estrellas, 10)).padEnd(5, '☆')}
                          </p>
                          <p><strong>📍 Domicilio:</strong> {hotel.domicilio}, {hotel.localidad}</p>
                          <p><strong>📞 Teléfono:</strong> {hotel.telefono_final}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-zinc-500">No se encontraron hoteles con esos criterios.</p>
                    )}
                  </div>
                );

              default:
                // Fallback para cualquier otra herramienta no personalizada
                return (
                    <pre key={`${message.id}-${i}`} className="p-2 my-2 bg-zinc-100 dark:bg-zinc-800 rounded text-xs">
                      {JSON.stringify(part, null, 2)}
                    </pre>
                  );
            }
          })}
        </div>
      ))}

      {/* --- FORMULARIO --- */}
      <form onSubmit={handleSubmit}>
        <input
          className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 rounded shadow-xl dark:bg-zinc-900 dark:border-zinc-800"
          value={input}
          placeholder="Busca artículos, prestadores o agencias..."
          onChange={e => setInput(e.target.value)}
        />
      </form>
    </div>
  );
}

// // app/page.jsx
// 'use client';

// import { useState } from 'react';
// import { useChat } from '@ai-sdk/react';

// const systemMessage = {
//   id: 'system-prompt',
//   role: 'system',
//   content: `
//     Eres un asistente virtual de turismo experto en la provincia de Tucumán, Argentina.
//     Puedes proporcionar información sobre atracciones, transportes, hoteles y alojamiento, alquiler de autos, prestadores de servicios, y artículos de interés.
//     Si la persona pregunta algo relacionado a informacion, planear, ayuda, conocer, etc. es necesario que busques sobre artículos.
//     buscar algo relacionado a autos es necesario que busques sobre el alquiler de autos. 
//     buscar algo relacionado a actividades o turismo aventura es necesario que busques sobre prestadores de servicios.
//     buscar sobre alojamiento o hoteles es necesario que busques sobre hoteles.
//     buscar sobre viajes guiados, tours o guias turisticos es necesario que busques sobre guías.
//     buscar sobre transporte, paradas, viajes, mediso de transporte, colectivos, como llegar a la ciudad, etc. es necesario que busques sobre transporte.
//   `,
// };

// export default function Chat() {
//   const [input, setInput] = useState(''); 

//   // --- LÓGICA DE ANÁLISIS (CORREGIDA) ---
//   const checkForEmptyToolOutputs = (message) => {
//     if (message.role !== 'assistant') {
//       return;
//     }
//     console.log("Analizando la respuesta final del asistente...");
//     console.log("Mensaje completo:", message); // Para debug
    
//     // Verificar si el mensaje tiene parts
//     if (!message.parts || !Array.isArray(message.parts)) {
//       console.log("El mensaje no tiene parts o no es un array");
//       return;
//     }
    
//     // La lógica de iteración sobre `message.parts`
//     message.parts.forEach((part, index) => {
//       console.log(`Analizando part ${index}:`, part); // Para debug
      
//       // En AI SDK 5.0, las tool calls pueden tener diferentes tipos
//       // Verificar múltiples tipos posibles de tool calls
//       if (part.type === 'tool-call' || part.type?.includes('tool-')) {
//         console.log('Tool call encontrado:', part);
        
//         // Verificar si existe el resultado/output
//         const result = part.result || part.output;
        
//         if (result != null) {
//           // Comprobamos si el resultado es un array vacío
//           if (Array.isArray(result) && result.length === 0) {
//             console.log('-------------------------------------------');
//             console.log('¡SALIDA DE HERRAMIENTA VACÍA DETECTADA!');
//             console.log('Nombre de la Herramienta:', part.toolName || part.name);
//             console.log('Argumentos utilizados:', part.args || part.arguments);
//             console.log('Tipo de part:', part.type);
//             console.log('-------------------------------------------');
            
//             // AQUÍ ES DONDE LLAMARÍAS A TU FUNCIÓN deepSearch(part.args)
//             // deepSearch(part.args || part.arguments);
//           } else {
//             console.log(`Tool call "${part.toolName || part.name}" devolvió ${Array.isArray(result) ? result.length : 'datos'} resultados`);
//           }
//         } else {
//           console.log(`Tool call "${part.toolName || part.name}" no tiene resultado`);
//         }
//       }
//     });
//   };

//   // --- CORRECCIÓN DEL onFinish ---
//   const { messages, sendMessage } = useChat({
//     // initialMessages: [systemMessage],
//     onFinish: (options) => { // ✅ CORRECTO: recibe un objeto con { message }
//       console.log("✅ Proceso completado en el FRONTEND.");
//       console.log("Opciones recibidas:", options); // Para debug
      
//       // ✅ CORRECTO: acceder al mensaje desde options.message
//       if (options && options.message) {
//         checkForEmptyToolOutputs(options.message);
//       } else {
//         console.warn("No se recibió un mensaje válido en onFinish");
//       }
//     },
//     onError: (e) => {
//       console.error("❌ Error en el frontend:", e);
//     }
//   });

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (!input.trim()) return;
//     console.log("Mensajes actuales:", messages);

//     // sendMessage sigue igual
//     sendMessage({
//       role: 'user',
//       parts: [{ type: 'text', text: input }],
//     });
//     setInput('');
//   };

//   return (
//     <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
//       {messages.map(message => (
//         <div key={message.id} className="whitespace-pre-wrap my-2">
//           <strong>{message.role === 'user' ? 'Tú: ' : 'IA: '}</strong>
//           {message.parts.map((part, i) => {
//             switch (part.type) {
//               case 'text':
//                 return <div key={`${message.id}-${i}`}>{part.text}</div>;

//               case "step-start":
//                 return

//               // --- RENDERIZADO PARA ARTÍCULOS ---
//               case 'tool-ConsultarArticulos':
//                 return (
//                   <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
//                     <p className="font-semibold mb-2">Aquí tienes algunos artículos relacionados:</p>
//                     {Array.isArray(part.output) && part.output.length > 0 ? (
//                       part.output.map(articulo => (
//                         <div key={articulo.idArticulo} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
//                           <p><strong>📝 {articulo.nombre}</strong></p>
//                           <p className="text-zinc-600 dark:text-zinc-400 mt-1">{articulo.copete}</p>
//                         </div>
//                       ))
//                     ) : (
//                       <p className="text-sm text-zinc-500">No se encontraron artículos con esos criterios.</p>
//                     )}
//                   </div>
//                 );

//               // --- RENDERIZADO PARA PRESTADORES ---
//               case 'tool-ConsultarPrestadores':
//                 return (
//                   <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
//                     <p className="font-semibold mb-2">Encontré estos prestadores:</p>
//                     {Array.isArray(part.output) && part.output.length > 0 ? (
//                       part.output.map(prestador => (
//                         <div key={prestador.id} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
//                           <p><strong>⭐ Título:</strong> {prestador.titulo}</p>
//                           <p><strong>🏞️ Actividades:</strong> {prestador.nombres_actividades}</p>
//                           <p><strong>👤 Responsable:</strong> {prestador.responsable}</p>
//                           <p><strong>📞 Teléfono:</strong> {prestador.telefono_final}</p>
//                         </div>
//                       ))
//                     ) : (
//                       <p className="text-sm text-zinc-500">No se encontraron prestadores con esos criterios.</p>
//                     )}
//                   </div>
//                 );

//               // --- RENDERIZADO PARA GUÍAS ---
//               case 'tool-ConsultarGuias':
//                 return (
//                   <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
//                     <p className="font-semibold mb-2">Estos son los guías que encontré:</p>
//                     {Array.isArray(part.output) && part.output.length > 0 ? (
//                       part.output.map(guia => (
//                         <div key={guia.id} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
//                           <p><strong>👤 {guia.nombre}</strong></p>
//                           <p className="mt-1"><strong>📜 Licencia:</strong> {guia.tipo_registro}</p>
//                           <p><strong>🗺️ Opera en:</strong> {guia.zona_operacion}</p>
//                           <p><strong>📞 Contacto:</strong> {guia.telefonos || 'No disponible'}</p>
//                         </div>
//                       ))
//                     ) : (
//                       <p className="text-sm text-zinc-500">No se encontraron guías con esos criterios.</p>
//                     )}
//                   </div>
//                 );

//               // --- RENDERIZADO PARA AUTOS ---
//               case 'tool-ConsultCars':
//                 return (
//                   <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
//                     <p className="font-semibold mb-2">Resultados de la búsqueda de autos:</p>
//                     {Array.isArray(part.output) && part.output.length > 0 ? (
//                       part.output.map(agencia => (
//                         <div key={agencia.id} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
//                           <p><strong>🏢 Nombre:</strong> {agencia.nombre}</p>
//                           <p><strong>📍 Dirección:</strong> {agencia.direccion}</p>
//                           <p><strong>📞 Teléfono:</strong> {agencia.telefonos}</p>
//                         </div>
//                       ))
//                     ) : (
//                       <p className="text-sm text-zinc-500">No se encontraron agencias con esos criterios.</p>
//                     )}
//                   </div>
//                 );

//               // --- RENDERIZADO PARA COLECTIVOS ---
//               case 'tool-ConsultarColectivos':
//                 return (
//                   <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
//                     <p className="font-semibold mb-2">Aquí están los itinerarios de colectivos:</p>
//                     {Array.isArray(part.output) && part.output.length > 0 ? (
//                       part.output.map(itinerario => (
//                         <div key={itinerario.Idtiene} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
//                           <p><strong>🚌 {itinerario.Empresa}</strong> a <strong>{itinerario.nombre_localidad}</strong></p>
//                           <p className="mt-1"><strong>🗓️ Días:</strong> {itinerario.dia}</p>
//                           <p><strong>➡️ Horarios Ida:</strong> {itinerario.ida.replaceAll(',', ' - ')}</p>
//                           <p><strong>⬅️ Horarios Vuelta:</strong> {itinerario.vuelta.replaceAll(',', ' - ')}</p>
//                           <p><strong>📍 Plataforma:</strong> {itinerario.Plataforma}</p>
//                           <p><strong>💲 Precio:</strong> {itinerario.Precio}</p>
//                         </div>
//                       ))
//                     ) : (
//                       <p className="text-sm text-zinc-500">No se encontraron itinerarios con esos criterios.</p>
//                     )}
//                   </div>
//                 );

//               // --- RENDERIZADO PARA HOTELES ---
//               case 'tool-ConsultarHoteles':
//                 return (
//                   <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
//                     <p className="font-semibold mb-2">He encontrado estos hoteles:</p>
//                     {Array.isArray(part.output) && part.output.length > 0 ? (
//                       part.output.map(hotel => (
//                         <div key={hotel.id} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
//                           <p><strong>🏨 {hotel.nombre}</strong></p>
//                           <p className="mt-1">
//                             <strong>⭐ Estrellas:</strong> {'★'.repeat(parseInt(hotel.estrellas, 10)).padEnd(5, '☆')}
//                           </p>
//                           <p><strong>📍 Domicilio:</strong> {hotel.domicilio}, {hotel.localidad}</p>
//                           <p><strong>📞 Teléfono:</strong> {hotel.telefono_final}</p>
//                         </div>
//                       ))
//                     ) : (
//                       <p className="text-sm text-zinc-500">No se encontraron hoteles con esos criterios.</p>
//                     )}
//                   </div>
//                 );

//               default:
//                 // Fallback para cualquier otra herramienta no personalizada
//                 return (
//                     <pre key={`${message.id}-${i}`} className="p-2 my-2 bg-zinc-100 dark:bg-zinc-800 rounded text-xs">
//                       {JSON.stringify(part, null, 2)}
//                     </pre>
//                   );
//             }
//           })}
//         </div>
//       ))}

//       {/* --- FORMULARIO --- */}
//       <form onSubmit={handleSubmit}>
//         <input
//           className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 rounded shadow-xl dark:bg-zinc-900 dark:border-zinc-800"
//           value={input}
//           placeholder="Busca artículos, prestadores o agencias..."
//           onChange={e => setInput(e.target.value)}
//         />
//       </form>
//     </div>
//   );
// }

// // app/page.jsx
// 'use client';

// import { useChat } from '@ai-sdk/react';
// import { useState } from 'react';

// const systemMessage = {
//   id: 'system-prompt', // ID único para el mensaje
//   role: 'system',
//   content: `
//     Eres un asistente virtual de turismo experto en la provincia de Tucumán, Argentina.
//     Puedes proporcionar información sobre atracciones, transportes, hoteles y alojamiento, alquiler de autos, prestadores de servicios, y artículos de interés.
//     Si la persona pregunta algo relacionado a informacion, planear, ayuda, conocer, etc. es necesario que busques sobre artículos.
//     buscar algo relacionado a autos es necesario que busques sobre el alquiler de autos. 
//     buscar algo relacionado a actividades o turismo aventura es necesario que busques sobre prestadores de servicios.
//     buscar sobre alojamiento o hoteles es necesario que busques sobre hoteles.
//     buscar sobre viajes guiados, tours o guias turisticos es necesario que busques sobre guías.
//     buscar sobre transporte, paradas, viajes, mediso de transporte, colectivos, como llegar a la ciudad, etc. es necesario que busques sobre transporte.
//   `,
// };

// export default function Chat() {
//   const [input, setInput] = useState('');
//   const { messages, sendMessage } = useChat({ initialMessages: [systemMessage] });

//   return (
//     <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
//       {messages.map(message => (
//         <div key={message.id} className="whitespace-pre-wrap my-2">
//           <strong>{message.role === 'user' ? 'Tú: ' : 'IA: '}</strong>
//           {message.parts.map((part, i) => {
//             switch (part.type) {
//               case 'text':
//                 return <div key={`${message.id}-${i}`}>{part.text}</div>;

//               case "step-start":
//                 return

//               // --- RENDERIZADO PARA ARTÍCULOS ---
//               case 'tool-ConsultarArticulos':
//                 return (
//                   <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
//                     <p className="font-semibold mb-2">Aquí tienes algunos artículos relacionados:</p>
//                     {Array.isArray(part.output) && part.output.length > 0 ? (
//                       part.output.map(articulo => (
//                         <div key={articulo.idArticulo} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
//                           <p><strong>📝 {articulo.nombre}</strong></p>
//                           <p className="text-zinc-600 dark:text-zinc-400 mt-1">{articulo.copete}</p>
//                         </div>
//                       ))
//                     ) : (
//                       <p className="text-sm text-zinc-500">No se encontraron artículos con esos criterios.</p>
//                     )}
//                   </div>
//                 );

//               // --- RENDERIZADO PARA PRESTADORES ---
//               case 'tool-ConsultarPrestadores':
//                 return (
//                   <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
//                     <p className="font-semibold mb-2">Encontré estos prestadores:</p>
//                     {Array.isArray(part.output) && part.output.length > 0 ? (
//                       part.output.map(prestador => (
//                         <div key={prestador.id} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
//                           <p><strong>⭐ Título:</strong> {prestador.titulo}</p>
//                           <p><strong>🏞️ Actividades:</strong> {prestador.nombres_actividades}</p>
//                           <p><strong>👤 Responsable:</strong> {prestador.responsable}</p>
//                           <p><strong>📞 Teléfono:</strong> {prestador.telefono_final}</p>
//                         </div>
//                       ))
//                     ) : (
//                       <p className="text-sm text-zinc-500">No se encontraron prestadores con esos criterios.</p>
//                     )}
//                   </div>
//                 );

//               // --- RENDERIZADO PARA GUÍAS ---
//               case 'tool-ConsultarGuias':
//                 return (
//                   <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
//                     <p className="font-semibold mb-2">Estos son los guías que encontré:</p>
//                     {Array.isArray(part.output) && part.output.length > 0 ? (
//                       part.output.map(guia => (
//                         <div key={guia.id} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
//                           <p><strong>👤 {guia.nombre}</strong></p>
//                           <p className="mt-1"><strong>📜 Licencia:</strong> {guia.tipo_registro}</p>
//                           <p><strong>🗺️ Opera en:</strong> {guia.zona_operacion}</p>
//                           <p><strong>📞 Contacto:</strong> {guia.telefonos || 'No disponible'}</p>
//                         </div>
//                       ))
//                     ) : (
//                       <p className="text-sm text-zinc-500">No se encontraron guías con esos criterios.</p>
//                     )}
//                   </div>
//                 );

//               // --- RENDERIZADO PARA AUTOS ---
//               case 'tool-ConsultCars':
//                 return (
//                   <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
//                     <p className="font-semibold mb-2">Resultados de la búsqueda de autos:</p>
//                     {Array.isArray(part.output) && part.output.length > 0 ? (
//                       part.output.map(agencia => (
//                         <div key={agencia.id} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
//                           <p><strong>🏢 Nombre:</strong> {agencia.nombre}</p>
//                           <p><strong>📍 Dirección:</strong> {agencia.direccion}</p>
//                           <p><strong>📞 Teléfono:</strong> {agencia.telefonos}</p>
//                         </div>
//                       ))
//                     ) : (
//                       <p className="text-sm text-zinc-500">No se encontraron agencias con esos criterios.</p>
//                     )}
//                   </div>
//                 );

//               // --- RENDERIZADO PARA COLECTIVOS ---
//               case 'tool-ConsultarColectivos':
//                 return (
//                   <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
//                     <p className="font-semibold mb-2">Aquí están los itinerarios de colectivos:</p>
//                     {Array.isArray(part.output) && part.output.length > 0 ? (
//                       part.output.map(itinerario => (
//                         <div key={itinerario.Idtiene} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
//                           <p><strong>🚌 {itinerario.Empresa}</strong> a <strong>{itinerario.nombre_localidad}</strong></p>
//                           <p className="mt-1"><strong>🗓️ Días:</strong> {itinerario.dia}</p>
//                           <p><strong>➡️ Horarios Ida:</strong> {itinerario.ida.replaceAll(',', ' - ')}</p>
//                           <p><strong>⬅️ Horarios Vuelta:</strong> {itinerario.vuelta.replaceAll(',', ' - ')}</p>
//                           <p><strong>📍 Plataforma:</strong> {itinerario.Plataforma}</p>
//                           <p><strong>💲 Precio:</strong> {itinerario.Precio}</p>
//                         </div>
//                       ))
//                     ) : (
//                       <p className="text-sm text-zinc-500">No se encontraron itinerarios con esos criterios.</p>
//                     )}
//                   </div>
//                 );

//               // --- RENDERIZADO PARA HOTELES ---
//               case 'tool-ConsultarHoteles':
//                 return (
//                   <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
//                     <p className="font-semibold mb-2">He encontrado estos hoteles:</p>
//                     {Array.isArray(part.output) && part.output.length > 0 ? (
//                       part.output.map(hotel => (
//                         <div key={hotel.id} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
//                           <p><strong>🏨 {hotel.nombre}</strong></p>
//                           <p className="mt-1">
//                             <strong>⭐ Estrellas:</strong> {'★'.repeat(parseInt(hotel.estrellas, 10)).padEnd(5, '☆')}
//                           </p>
//                           <p><strong>📍 Domicilio:</strong> {hotel.domicilio}, {hotel.localidad}</p>
//                           <p><strong>📞 Teléfono:</strong> {hotel.telefono_final}</p>
//                         </div>
//                       ))
//                     ) : (
//                       <p className="text-sm text-zinc-500">No se encontraron hoteles con esos criterios.</p>
//                     )}
//                   </div>
//                 );

//               default:
//                 // Fallback para cualquier otra herramienta no personalizada
//                 return (
//                     <pre key={`${message.id}-${i}`} className="p-2 my-2 bg-zinc-100 dark:bg-zinc-800 rounded text-xs">
//                       {JSON.stringify(part, null, 2)}
//                     </pre>
//                   );
//             }
//           })}
//         </div>
//       ))}

//       <form
//         onSubmit={e => {
//           e.preventDefault();
//           if (!input.trim()) return;
//           sendMessage({ text: input });
//           setInput('');
//           console.log(messages);
//         }}
//       >
//         <input
//           className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 rounded shadow-xl dark:bg-zinc-900 dark:border-zinc-800"
//           value={input}
//           placeholder="Busca artículos, prestadores o agencias..."
//           onChange={e => setInput(e.currentTarget.value)}
//         />
//       </form>
//     </div>
//   );
// }

// // app/page.jsx
// 'use client';

// import { useChat } from '@ai-sdk/react';
// import { useState } from 'react';

// export default function Chat() {
//   const [input, setInput] = useState('');
//   const { messages, sendMessage } = useChat();

//   return (
//     <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
//       {messages.map(message => (
//         <div key={message.id} className="whitespace-pre-wrap my-2">
//           <strong>{message.role === 'user' ? 'Tú: ' : 'IA: '}</strong>
//           {message.parts.map((part, i) => {
//             switch (part.type) {
//               case 'text':
//                 return <div key={`${message.id}-${i}`}>{part.text}</div>;

//               // --- RENDERIZADO PARA ARTÍCULOS ---
//               case 'tool-ConsultarArticulos':
//                 return (
//                   <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
//                     <p className="font-semibold mb-2">Aquí tienes algunos artículos relacionados:</p>
//                     {Array.isArray(part.output) && part.output.length > 0 ? (
//                       part.output.map(articulo => (
//                         <div key={articulo.idArticulo} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
//                           <p><strong>📝 {articulo.nombre}</strong></p>
//                           <p className="text-zinc-600 dark:text-zinc-400 mt-1">{articulo.copete}</p>
//                         </div>
//                       ))
//                     ) : (
//                       <p className="text-sm text-zinc-500">No se encontraron artículos con esos criterios.</p>
//                     )}
//                   </div>
//                 );

//               // --- RENDERIZADO PARA PRESTADORES ---
//               case 'tool-ConsultarPrestadores':
//                 return (
//                   <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
//                     <p className="font-semibold mb-2">Encontré estos prestadores:</p>
//                     {Array.isArray(part.output) && part.output.length > 0 ? (
//                       part.output.map(prestador => (
//                         <div key={prestador.id} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
//                           <p><strong>⭐ Título:</strong> {prestador.titulo}</p>
//                           <p><strong>🏞️ Actividades:</strong> {prestador.nombres_actividades}</p>
//                           <p><strong>👤 Responsable:</strong> {prestador.responsable}</p>
//                           <p><strong>📞 Teléfono:</strong> {prestador.telefono_final}</p>
//                         </div>
//                       ))
//                     ) : (
//                       <p className="text-sm text-zinc-500">No se encontraron prestadores con esos criterios.</p>
//                     )}
//                   </div>
//                 );
              
//               // --- RENDERIZADO PARA AUTOS ---
//               case 'tool-ConsultCars':
//                 return (
//                   <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
//                     <p className="font-semibold mb-2">Resultados de la búsqueda de autos:</p>
//                     {Array.isArray(part.output) && part.output.length > 0 ? (
//                       part.output.map(agencia => (
//                         <div key={agencia.id} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
//                           <p><strong>🏢 Nombre:</strong> {agencia.nombre}</p>
//                           <p><strong>📍 Dirección:</strong> {agencia.direccion}</p>
//                           <p><strong>📞 Teléfono:</strong> {agencia.telefonos}</p>
//                         </div>
//                       ))
//                     ) : (
//                       <p className="text-sm text-zinc-500">No se encontraron agencias con esos criterios.</p>
//                     )}
//                   </div>
//                 );

//               default:
//                 // Fallback para cualquier otra herramienta no personalizada
//                 return (
//                     <pre key={`${message.id}-${i}`} className="p-2 my-2 bg-zinc-100 dark:bg-zinc-800 rounded text-xs">
//                       {JSON.stringify(part, null, 2)}
//                     </pre>
//                   );
//             }
//           })}
//         </div>
//       ))}

//       <form
//         onSubmit={e => {
//           e.preventDefault();
//           if (!input.trim()) return;
//           sendMessage({ text: input });
//           setInput('');
//         }}
//       >
//         <input
//           className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 rounded shadow-xl dark:bg-zinc-900 dark:border-zinc-800"
//           value={input}
//           placeholder="Busca artículos, prestadores o agencias..."
//           onChange={e => setInput(e.currentTarget.value)}
//         />
//       </form>
//     </div>
//   );
// }

// 'use client';

// import { useChat } from '@ai-sdk/react';
// import { useState } from 'react';

// export default function Chat() {
//   const [input, setInput] = useState('');
//   const { messages, sendMessage } = useChat();

//   return (
//     <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
//       {messages.map(message => (
//         <div key={message.id} className="whitespace-pre-wrap my-2">
//           <strong>{message.role === 'user' ? 'Tú: ' : 'IA: '}</strong>
//           {message.parts.map((part, i) => {
//             switch (part.type) {
//               case 'text':
//                 return <div key={`${message.id}-${i}`}>{part.text}</div>;

//               // --- RENDERIZADO PARA PRESTADORES ---
//               case 'tool-ConsultarPrestadores':
//                 return (
//                   <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
//                     <p className="font-semibold mb-2">Encontré estos prestadores:</p>
//                     {Array.isArray(part.output) && part.output.length > 0 ? (
//                       part.output.map(prestador => (
//                         <div key={prestador.id} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
//                           <p><strong>⭐ Título:</strong> {prestador.titulo}</p>
//                           <p><strong>🏞️ Actividades:</strong> {prestador.nombres_actividades}</p>
//                           <p><strong>👤 Responsable:</strong> {prestador.responsable}</p>
//                           <p><strong>📞 Teléfono:</strong> {prestador.telefono_final}</p>
//                         </div>
//                       ))
//                     ) : (
//                       <p className="text-sm text-zinc-500">No se encontraron prestadores con esos criterios.</p>
//                     )}
//                   </div>
//                 );
              
//               // --- RENDERIZADO PARA AUTOS ---
//               case 'tool-ConsultCars':
//                 return (
//                   <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
//                     <p className="font-semibold mb-2">Resultados de la búsqueda de autos:</p>
//                     {Array.isArray(part.output) && part.output.length > 0 ? (
//                       part.output.map(agencia => (
//                         <div key={agencia.id} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
//                           <p><strong>🏢 Nombre:</strong> {agencia.nombre}</p>
//                           <p><strong>📍 Dirección:</strong> {agencia.direccion}</p>
//                           <p><strong>📞 Teléfono:</strong> {agencia.telefonos}</p>
//                         </div>
//                       ))
//                     ) : (
//                       <p className="text-sm text-zinc-500">No se encontraron agencias con esos criterios.</p>
//                     )}
//                   </div>
//                 );

//               default:
//                 // Fallback para cualquier otra herramienta no personalizada
//                 return (
//                     <pre key={`${message.id}-${i}`} className="p-2 my-2 bg-zinc-100 dark:bg-zinc-800 rounded text-xs">
//                       {JSON.stringify(part, null, 2)}
//                     </pre>
//                   );
//             }
//           })}
//         </div>
//       ))}

//       <form
//         onSubmit={e => {
//           e.preventDefault();
//           if (!input.trim()) return;
//           sendMessage({ text: input });
//           setInput('');
//         }}
//       >
//         <input
//           className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 rounded shadow-xl dark:bg-zinc-900 dark:border-zinc-800"
//           value={input}
//           placeholder="Busca agencias de autos o actividades..."
//           onChange={e => setInput(e.currentTarget.value)}
//         />
//       </form>
//     </div>
//   );
// }





// // // app/page.jsx

// // app/page.jsx

// 'use client';

// import { useChat } from '@ai-sdk/react';
// import { useState } from 'react';

// export default function Chat() {
//   const [input, setInput] = useState('');
//   const { messages, sendMessage } = useChat();

//   return (
//     <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
//       {messages.map(message => (
//         <div key={message.id} className="whitespace-pre-wrap my-2">
//           <strong>{message.role === 'user' ? 'Tú: ' : 'IA: '}</strong>
//           {message.parts.map((part, i) => {
//             switch (part.type) {
//               case 'text':
//                 return <div key={`${message.id}-${i}`}>{part.text}</div>;

//               // --- INICIO RENDERIZADO PERSONALIZADO PARA ConsultCars ---
//               case 'tool-ConsultCars':
//                 return (
//                   <div key={`${message.id}-${i}`} className="p-3 my-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shadow-sm">
//                     <p className="font-semibold mb-2">Resultados de la búsqueda:</p>
//                     {/* 👇 CAMBIO AQUÍ: de part.result a part.output */}
//                     {Array.isArray(part.output) && part.output.length > 0 ? (
//                       // 👇 Y CAMBIO AQUÍ: de part.result a part.output
//                       part.output.map(agencia => (
//                         <div key={agencia.id} className="mt-2 border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm">
//                           <p><strong>🏢 Nombre:</strong> {agencia.nombre}</p>
//                           <p><strong>📍 Dirección:</strong> {agencia.direccion}</p>
//                           <p><strong>📞 Teléfono:</strong> {agencia.telefonos}</p>
//                         </div>
//                       ))
//                     ) : (
//                       <p className="text-sm text-zinc-500">No se encontraron agencias con esos criterios.</p>
//                     )}
//                   </div>
//                 );
//               // --- FIN RENDERIZADO PERSONALIZADO ---

//               // Renderizado por defecto para las otras herramientas
//               case 'tool-weather':
//               case 'tool-convertFahrenheitToCelsius':
//                 return (
//                   <pre key={`${message.id}-${i}`} className="p-2 my-2 bg-zinc-100 dark:bg-zinc-800 rounded text-xs">
//                     {JSON.stringify(part, null, 2)}
//                   </pre>
//                 );
//               default:
//                 return null;
//             }
//           })}
//         </div>
//       ))}

//       <form
//         onSubmit={e => {
//           e.preventDefault();
//           if (!input.trim()) return;
//           sendMessage({ text: input });
//           setInput('');
//         }}
//       >
//         <input
//           className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 rounded shadow-xl dark:bg-zinc-900 dark:border-zinc-800"
//           value={input}
//           placeholder="Busca una agencia de autos..."
//           onChange={e => setInput(e.currentTarget.value)}
//         />
//       </form>
//     </div>
//   );
// }





// 'use client';

// import { useChat } from '@ai-sdk/react';
// import { useState } from 'react';

// export default function Chat() {
//   const [input, setInput] = useState('');
//   const { messages, sendMessage } = useChat();

//   return (
//     <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
//       {messages.map(message => (
//         <div key={message.id} className="whitespace-pre-wrap">
//           {message.role === 'user' ? 'User: ' : 'AI: '}
//           {message.parts.map((part, i) => {
//             switch (part.type) {
//               case 'text':
//                 return <div key={`${message.id}-${i}`}>{part.text}</div>;
//               // 👇 Esta es la línea que cambia
//               case 'tool-weather':
//               case 'tool-convertFahrenheitToCelsius':
//                 return (
//                   <pre key={`${message.id}-${i}`}>
//                     {JSON.stringify(part, null, 2)}
//                   </pre>
//                 );
//             }
//           })}
//         </div>
//       ))}

//       {/* El formulario se mantiene igual */}
//       <form
//         onSubmit={e => {
//           e.preventDefault();
//           sendMessage({ text: input });
//           setInput('');
//         }}
//       >
//         <input
//           className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 rounded shadow-xl dark:bg-zinc-900 dark:border-zinc-800"
//           value={input}
//           placeholder="Say something..."
//           onChange={e => setInput(e.currentTarget.value)}
//         />
//       </form>
//     </div>
//   );
// }
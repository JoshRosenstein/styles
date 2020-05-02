module.exports = (api) => {
  const module = api.env('module')
  const esm = api.env('esm')
  const umd = api.env('umd')

  return {
    presets: [
      [
        '@lunde/es',
        {
          env: {
            modules: esm || module || umd ? false : 'commonjs',
            targets: module
              ? {
                  browsers: '> 2%',
                }
              : umd
              ? {
                  browsers:
                    '> 0.5%, ie >= 10, safari >= 9, firefox >= 43, ios >= 8',
                }
              : esm
              ? {
                  node: '12',
                }
              : {
                  node: '10',
                },
          },
          devExpression: false,
          objectAssign: umd,
        },
      ],
    ],
    plugins: ['annotate-pure-calls'],
  }
}

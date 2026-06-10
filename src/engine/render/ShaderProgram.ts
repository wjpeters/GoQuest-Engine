export class ShaderProgram {
  readonly program: WebGLProgram;

  constructor(
    private gl: WebGL2RenderingContext,
    vertexSource: string,
    fragmentSource: string,
  ) {
    const vertex = this.compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = this.compile(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!program) {
      throw new Error("Unable to create WebGL shader program.");
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(String(gl.getProgramInfoLog(program)));
    }
    this.program = program;
  }

  use() {
    this.gl.useProgram(this.program);
  }

  uniform(name: string) {
    return this.gl.getUniformLocation(this.program, name);
  }

  attrib(name: string) {
    return this.gl.getAttribLocation(this.program, name);
  }

  private compile(type: number, source: string) {
    const shader = this.gl.createShader(type);
    if (!shader) {
      throw new Error("Unable to create WebGL shader.");
    }
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error(String(this.gl.getShaderInfoLog(shader)));
    }
    return shader;
  }
}

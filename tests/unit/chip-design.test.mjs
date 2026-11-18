import test from 'node:test';
import assert from 'node:assert/strict';
import { chipDesignTools } from '../../server/tools/chip-design-tools.js';

// ============================================================================
// VERILOG TEST FIXTURES
// ============================================================================

const VERILOG_ADDER4_DUT = `
module adder4 (
  input wire [3:0] a,
  input wire [3:0] b,
  input wire cin,
  output wire [3:0] sum,
  output wire cout
);
  assign {cout, sum} = a + b + cin;
endmodule
`;

const VERILOG_ADDER4_TB = `
module tb_adder4;
  reg [3:0] a;
  reg [3:0] b;
  reg cin;
  wire [3:0] sum;
  wire cout;

  adder4 uut (
    .a(a),
    .b(b),
    .cin(cin),
    .sum(sum),
    .cout(cout)
  );

  initial begin
    // Test 1: 2 + 3 + 0 = 5 (cout=0)
    a = 4'd2; b = 4'd3; cin = 1'b0;
    #10;
    if (sum !== 4'd5 || cout !== 1'b0) $error("Test 1 Failed: 2 + 3 = %d, cout = %b", sum, cout);
    else $display("Test 1 Passed: 2 + 3 = %d, cout = %b", sum, cout);

    // Test 2: 7 + 8 + 0 = 15 (cout=0)
    a = 4'd7; b = 4'd8; cin = 1'b0;
    #10;
    if (sum !== 4'd15 || cout !== 1'b0) $error("Test 2 Failed");
    else $display("Test 2 Passed: 7 + 8 = %d", sum);

    // Test 3: 15 + 1 + 0 = 0 (cout=1, overflow)
    a = 4'd15; b = 4'd1; cin = 1'b0;
    #10;
    if (sum !== 4'd0 || cout !== 1'b1) $error("Test 3 Failed: 15 + 1 = %d, cout = %b", sum, cout);
    else $display("Test 3 Passed: 15 + 1 = %d (cout=%b)", sum, cout);

    // Test 4: 9 + 6 + 1 = 0 (cout=1)
    a = 4'd9; b = 4'd6; cin = 1'b1;
    #10;
    if (sum !== 4'd0 || cout !== 1'b1) $error("Test 4 Failed");
    else $display("Test 4 Passed: 9 + 6 + 1 = %d (cout=%b)", sum, cout);

    $finish;
  end
endmodule
`;

const VERILOG_ALU_DUT = `
module alu_4bit (
  input wire [3:0] a,
  input wire [3:0] b,
  input wire [2:0] opcode,
  output reg [3:0] result,
  output reg zero,
  output reg carry
);
  localparam OP_ADD = 3'b000;
  localparam OP_SUB = 3'b001;
  localparam OP_AND = 3'b010;
  localparam OP_OR  = 3'b011;
  localparam OP_XOR = 3'b100;
  localparam OP_NOT = 3'b101;
  localparam OP_SHL = 3'b110;
  localparam OP_SHR = 3'b111;

  always @(*) begin
    carry = 1'b0;
    case (opcode)
      OP_ADD: {carry, result} = a + b;
      OP_SUB: {carry, result} = a - b;
      OP_AND: result = a & b;
      OP_OR:  result = a | b;
      OP_XOR: result = a ^ b;
      OP_NOT: result = ~a;
      OP_SHL: result = a << b[1:0];
      OP_SHR: result = a >> b[1:0];
      default: result = 4'b0000;
    endcase
    zero = (result == 4'b0000);
  end
endmodule
`;

const VERILOG_ALU_TB = `
module tb_alu;
  reg [3:0] a;
  reg [3:0] b;
  reg [2:0] opcode;
  wire [3:0] result;
  wire zero;
  wire carry;

  alu_4bit uut (
    .a(a),
    .b(b),
    .opcode(opcode),
    .result(result),
    .zero(zero),
    .carry(carry)
  );

  initial begin
    // ADD: 5 + 3 = 8
    a = 4'd5; b = 4'd3; opcode = 3'b000;
    #10;
    if (result !== 4'd8 || zero !== 1'b0) $error("ALU ADD failed");
    else $display("ALU ADD passed: 5 + 3 = %d", result);

    // SUB: 9 - 4 = 5
    a = 4'd9; b = 4'd4; opcode = 3'b001;
    #10;
    if (result !== 4'd5) $error("ALU SUB failed");
    else $display("ALU SUB passed: 9 - 4 = %d", result);

    // AND: 4'b1100 & 4'b1010 = 4'b1000
    a = 4'b1100; b = 4'b1010; opcode = 3'b010;
    #10;
    if (result !== 4'b1000) $error("ALU AND failed");
    else $display("ALU AND passed: %b", result);

    // OR: 4'b1100 | 4'b0011 = 4'b1111
    a = 4'b1100; b = 4'b0011; opcode = 3'b011;
    #10;
    if (result !== 4'b1111) $error("ALU OR failed");
    else $display("ALU OR passed: %b", result);

    // XOR: 4'b1010 ^ 4'b0110 = 4'b1100
    a = 4'b1010; b = 4'b0110; opcode = 3'b100;
    #10;
    if (result !== 4'b1100) $error("ALU XOR failed");
    else $display("ALU XOR passed: %b", result);

    // SUB to zero: 4 - 4 = 0 (zero=1)
    a = 4'd4; b = 4'd4; opcode = 3'b001;
    #10;
    if (result !== 4'd0 || zero !== 1'b1) $error("ALU ZERO FLAG failed");
    else $display("ALU ZERO FLAG passed: result=%d, zero=%b", result, zero);

    $finish;
  end
endmodule
`;

const VERILOG_SHIFT_REG_DUT = `
module shift_register_4bit (
  input wire clk,
  input wire rst_n,
  input wire shift_en,
  input wire din,
  output reg [3:0] dout
);
  always @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      dout <= 4'b0000;
    end else if (shift_en) begin
      dout <= {dout[2:0], din};
    end
  end
endmodule
`;

const VERILOG_SHIFT_REG_TB = `
module tb_shift_reg;
  reg clk;
  reg rst_n;
  reg shift_en;
  reg din;
  wire [3:0] dout;

  shift_register_4bit uut (
    .clk(clk),
    .rst_n(rst_n),
    .shift_en(shift_en),
    .din(din),
    .dout(dout)
  );

  always #5 clk = ~clk;

  initial begin
    clk = 0;
    rst_n = 0;
    shift_en = 0;
    din = 0;
    #12;
    rst_n = 1;
    #8;

    // Shift in 1
    shift_en = 1; din = 1;
    #10;

    // Shift in 0
    din = 0;
    #10;

    // Shift in 1
    din = 1;
    #10;

    // Shift in 1
    din = 1;
    #10;

    shift_en = 0;
    #10;

    if (dout === 4'b1011) $display("Shift Register test passed: dout = %b", dout);
    else $error("Shift Register test failed: expected 4'b1011, got %b", dout);

    $finish;
  end
endmodule
`;

// ============================================================================
// UNIT TESTS
// ============================================================================

test('EDA Tool 1: compile_verilog parses RTL modules, ports, and parameters', async () => {
  // Test compiling 4-bit adder
  const adderRes = await chipDesignTools.compile_verilog.execute({ code: VERILOG_ADDER4_DUT });
  assert.equal(adderRes.success, true, 'Adder compilation must succeed');
  assert.equal(adderRes.modules.length, 1);
  assert.equal(adderRes.modules[0].name, 'adder4');
  assert.equal(adderRes.modules[0].ports.length, 5);

  const portA = adderRes.modules[0].ports.find((p) => p.name === 'a');
  assert.ok(portA);
  assert.equal(portA.direction, 'input');
  assert.equal(portA.width, 4);

  const portSum = adderRes.modules[0].ports.find((p) => p.name === 'sum');
  assert.ok(portSum);
  assert.equal(portSum.direction, 'output');
  assert.equal(portSum.width, 4);

  // Test compiling 4-bit ALU
  const aluRes = await chipDesignTools.compile_verilog.execute({ code: VERILOG_ALU_DUT });
  assert.equal(aluRes.success, true, 'ALU compilation must succeed');
  assert.equal(aluRes.modules[0].name, 'alu_4bit');
  assert.ok(aluRes.modules[0].registers.includes('result'));
  assert.ok(aluRes.modules[0].registers.includes('zero'));
  assert.ok(aluRes.modules[0].registers.includes('carry'));

  // Test compiling shift register
  const shiftRes = await chipDesignTools.compile_verilog.execute({ code: VERILOG_SHIFT_REG_DUT });
  assert.equal(shiftRes.success, true, 'Shift register compilation must succeed');
  assert.equal(shiftRes.modules[0].name, 'shift_register_4bit');
  assert.equal(shiftRes.modules[0].alwaysBlocksCount, 1);
  assert.ok(shiftRes.modules[0].registers.includes('dout'));

  // Negative test: syntax error detection
  const badRes = await chipDesignTools.compile_verilog.execute({
    code: 'module broken (input wire a, output wire b);\n  assign b = a +\nendmodule',
  });
  assert.equal(badRes.success, false, 'Malformed syntax must fail compilation');
  assert.ok(badRes.errors.length > 0, 'Must report syntax errors');
});

test('EDA Tool 2: run_testbench executes 4-bit Adder testbench with passing assertions', async () => {
  const result = await chipDesignTools.run_testbench.execute({
    dutCode: VERILOG_ADDER4_DUT,
    testbenchCode: VERILOG_ADDER4_TB,
  });

  assert.equal(result.success, true, 'Testbench must complete successfully');
  assert.equal(result.passed, true, 'All testbench assertions must pass');
  assert.equal(result.assertFailCount, 0, 'No failed assertions allowed');
  assert.ok(
    result.assertPassCount >= 4,
    `Expected at least 4 passed checks, got ${result.assertPassCount}`,
  );
  assert.ok(
    result.simulationTimeNs >= 40,
    `Simulation time should be >= 40ns, got ${result.simulationTimeNs}`,
  );
  assert.ok(result.vcdTrace.includes('$version'), 'VCD trace must contain IEEE 1364 header');
  assert.ok(result.logs.some((l) => l.includes('Test 1 Passed: 2 + 3 = 5')));
  assert.ok(result.logs.some((l) => l.includes('Test 3 Passed: 15 + 1 = 0')));
});

test('EDA Tool 2: run_testbench executes 4-bit ALU testbench verifying arithmetic and logic operations', async () => {
  const result = await chipDesignTools.run_testbench.execute({
    dutCode: VERILOG_ALU_DUT,
    testbenchCode: VERILOG_ALU_TB,
  });

  assert.equal(result.success, true);
  assert.equal(result.passed, true);
  assert.equal(result.assertFailCount, 0);
  assert.ok(
    result.assertPassCount >= 6,
    `Expected at least 6 passed tests, got ${result.assertPassCount}`,
  );
  assert.ok(result.logs.some((l) => l.includes('ALU ADD passed: 5 + 3 = 8')));
  assert.ok(result.logs.some((l) => l.includes('ALU SUB passed: 9 - 4 = 5')));
  assert.ok(result.logs.some((l) => l.includes('ALU ZERO FLAG passed')));
});

test('EDA Tool 2: run_testbench simulates sequential Shift Register across clock cycles', async () => {
  const result = await chipDesignTools.run_testbench.execute({
    dutCode: VERILOG_SHIFT_REG_DUT,
    testbenchCode: VERILOG_SHIFT_REG_TB,
  });

  assert.equal(result.success, true);
  assert.equal(result.passed, true);
  assert.equal(result.assertFailCount, 0);
  assert.ok(result.clockCycles >= 5, `Expected multiple clock cycles, got ${result.clockCycles}`);
  assert.ok(result.logs.some((l) => l.includes('Shift Register test passed: dout = 1011')));
});

test('EDA Tool 2: run_testbench detects and flags assertion failures correctly', async () => {
  const FAILING_TB = `
  module tb_failing;
    reg [3:0] a, b;
    wire [3:0] sum;
    wire cout;

    adder4 uut (.a(a), .b(b), .cin(1'b0), .sum(sum), .cout(cout));

    initial begin
      a = 4'd2; b = 4'd2;
      #10;
      if (sum !== 4'd99) $error("Intentional failure: sum is not 99");
      $finish;
    end
  endmodule
  `;

  const result = await chipDesignTools.run_testbench.execute({
    dutCode: VERILOG_ADDER4_DUT,
    testbenchCode: FAILING_TB,
  });

  assert.equal(result.passed, false, 'Failing assertion must set passed = false');
  assert.ok(result.assertFailCount >= 1, 'assertFailCount must be >= 1');
  assert.ok(result.logs.some((l) => l.includes('Intentional failure')));
});

test('EDA Tool 3: analyze_rtl_timing performs gate synthesis and critical path analysis', async () => {
  // 1. Analyze 4-bit Adder
  const adderTiming = await chipDesignTools.analyze_rtl_timing.execute({
    code: VERILOG_ADDER4_DUT,
    clockPeriodNs: 10.0,
    targetTechnology: 'generic',
  });

  assert.equal(adderTiming.success, true);
  assert.equal(adderTiming.moduleName, 'adder4');
  assert.ok(adderTiming.gateCount.nandEquivalents > 0);
  assert.ok(adderTiming.timingAnalysis.criticalPathDelayNs > 0);
  assert.equal(adderTiming.timingAnalysis.slackStatus, 'MET');
  assert.ok(
    adderTiming.timingAnalysis.maxFrequencyMHz > 500,
    `Fmax should be > 500MHz, got ${adderTiming.timingAnalysis.maxFrequencyMHz}`,
  );

  // 2. Analyze Shift Register (Sequential)
  const shiftTiming = await chipDesignTools.analyze_rtl_timing.execute({
    code: VERILOG_SHIFT_REG_DUT,
    clockPeriodNs: 5.0, // 200MHz
    targetTechnology: 'generic',
  });

  assert.equal(shiftTiming.success, true);
  assert.equal(shiftTiming.gateCount.flipFlops, 4, 'Shift register must have 4 flip-flops');
  assert.ok(shiftTiming.gateCount.nandEquivalents >= 24);
  assert.equal(shiftTiming.timingAnalysis.slackStatus, 'MET');

  // 3. Compare with ASIC 7nm FinFET technology
  const asicTiming = await chipDesignTools.analyze_rtl_timing.execute({
    code: VERILOG_ADDER4_DUT,
    clockPeriodNs: 1.0, // 1 GHz
    targetTechnology: 'asic_7nm',
  });

  assert.equal(asicTiming.success, true);
  assert.ok(
    asicTiming.timingAnalysis.criticalPathDelayNs < adderTiming.timingAnalysis.criticalPathDelayNs,
    '7nm ASIC must have lower delay than generic CMOS',
  );
  assert.ok(
    asicTiming.timingAnalysis.maxFrequencyMHz > adderTiming.timingAnalysis.maxFrequencyMHz,
    '7nm ASIC must achieve higher Fmax',
  );
});

test('EDA Tool 4: export_waveform_vcd generates, parses, and visualizes VCD traces', async () => {
  const signals = [
    { name: 'clk', width: 1, type: 'wire' },
    { name: 'rst_n', width: 1, type: 'wire' },
    { name: 'data', width: 4, type: 'wire' },
  ];

  const timeline = [
    { time: 0, values: { clk: '0', rst_n: '0', data: '0000' } },
    { time: 5, values: { clk: '1', rst_n: '0', data: '0000' } },
    { time: 10, values: { clk: '0', rst_n: '1', data: '0101' } },
    { time: 15, values: { clk: '1', rst_n: '1', data: '0101' } },
    { time: 20, values: { clk: '0', rst_n: '1', data: '1010' } },
  ];

  // 1. Generate VCD
  const genRes = await chipDesignTools.export_waveform_vcd.execute({
    action: 'generate',
    signals,
    timeline,
    timescale: '1ns',
  });

  assert.equal(genRes.success, true);
  assert.ok(genRes.vcdContent.includes('$timescale\n   1ns\n$end'));
  assert.ok(genRes.vcdContent.includes('$var wire 1 ! clk $end'));
  assert.ok(genRes.vcdContent.includes('$var wire 4 # data $end'));
  assert.ok(genRes.vcdContent.includes('#10'));

  // 2. Parse VCD
  const parseRes = await chipDesignTools.export_waveform_vcd.execute({
    action: 'parse',
    vcdContent: genRes.vcdContent,
  });

  assert.equal(parseRes.success, true);
  assert.equal(parseRes.signals.length, 3);
  assert.equal(parseRes.timeline.length, 5);
  assert.equal(parseRes.endTime, 20);

  // 3. ASCII Waveform visualization
  const visRes = await chipDesignTools.export_waveform_vcd.execute({
    action: 'visualize_ascii',
    vcdContent: genRes.vcdContent,
  });

  assert.equal(visRes.success, true);
  assert.ok(visRes.asciiWaveform.includes('Time (ns)'));
  assert.ok(visRes.asciiWaveform.includes('clk'));
  assert.ok(visRes.asciiWaveform.includes('rst_n'));
  assert.ok(visRes.asciiWaveform.includes('data'));
});

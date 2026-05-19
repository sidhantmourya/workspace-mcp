import { SourceFile, SyntaxKind } from "ts-morph";

export type AngularComponent = {
  name: string;
  selector: string;
  templateUrl: string | null;
  styleUrls: string[];
  inputs: string[];
  outputs: string[];
};

export type AngularInjectable = {
  name: string;
  providedIn: string | null;
  methods: string[];
};

export type AngularModule = {
  name: string;
  declarations: string[];
  imports: string[];
  exports: string[];
  providers: string[];
};

/**
 * Extract all @Component decorated classes from a source file.
 */
export function getComponents(sourceFile: SourceFile): AngularComponent[] {
  const results: AngularComponent[] = [];

  for (const cls of sourceFile.getClasses()) {
    const decorator = cls.getDecorator("Component");
    if (!decorator) continue;

    const args = getDecoratorObjectArg(decorator);

    results.push({
      name: cls.getName() ?? "(unknown)",
      selector: getStringProp(args, "selector"),
      templateUrl: getStringPropOrNull(args, "templateUrl"),
      styleUrls: getArrayProp(args, "styleUrls"),
      inputs: getClassInputs(cls),
      outputs: getClassOutputs(cls),
    });
  }

  return results;
}

/**
 * Extract all @Injectable decorated classes from a source file.
 */
export function getInjectables(sourceFile: SourceFile): AngularInjectable[] {
  const results: AngularInjectable[] = [];

  for (const cls of sourceFile.getClasses()) {
    const decorator = cls.getDecorator("Injectable");
    if (!decorator) continue;

    const args = getDecoratorObjectArg(decorator);

    results.push({
      name: cls.getName() ?? "(unknown)",
      providedIn: getStringPropOrNull(args, "providedIn"),
      methods: cls.getMethods().map((m) => m.getName()),
    });
  }

  return results;
}

/**
 * Extract all @NgModule decorated classes from a source file.
 */
export function getModules(sourceFile: SourceFile): AngularModule[] {
  const results: AngularModule[] = [];

  for (const cls of sourceFile.getClasses()) {
    const decorator = cls.getDecorator("NgModule");
    if (!decorator) continue;

    const args = getDecoratorObjectArg(decorator);

    results.push({
      name: cls.getName() ?? "(unknown)",
      declarations: getArrayProp(args, "declarations"),
      imports: getArrayProp(args, "imports"),
      exports: getArrayProp(args, "exports"),
      providers: getArrayProp(args, "providers"),
    });
  }

  return results;
}

// --- internal helpers ---

type ObjectArg = Record<string, string | string[]>;

function getDecoratorObjectArg(decorator: ReturnType<SourceFile["getClasses"]>[number]["getDecorator"] extends (name: string) => infer R ? NonNullable<R> : never): ObjectArg {
  const args = decorator.getArguments();
  if (args.length === 0) return {};

  const obj = args[0];
  const result: ObjectArg = {};

  if (obj.getKind() !== SyntaxKind.ObjectLiteralExpression) return result;

  for (const prop of (obj as any).getProperties()) {
    const name = prop.getName?.();
    const initializer = prop.getInitializer?.();
    if (!name || !initializer) continue;

    const kind = initializer.getKind();

    if (kind === SyntaxKind.StringLiteral) {
      result[name] = initializer.getText().replace(/['"]/g, "");
    } else if (kind === SyntaxKind.ArrayLiteralExpression) {
      result[name] = (initializer as any)
        .getElements()
        .map((el: any) => el.getText().replace(/['"]/g, ""));
    }
  }

  return result;
}

function getStringProp(obj: ObjectArg, key: string): string {
  const val = obj[key];
  return typeof val === "string" ? val : "";
}

function getStringPropOrNull(obj: ObjectArg, key: string): string | null {
  const val = obj[key];
  return typeof val === "string" ? val : null;
}

function getArrayProp(obj: ObjectArg, key: string): string[] {
  const val = obj[key];
  return Array.isArray(val) ? val : [];
}

function getClassInputs(cls: ReturnType<SourceFile["getClasses"]>[number]): string[] {
  return cls.getProperties()
    .filter((p) => p.getDecorator("Input") !== undefined)
    .map((p) => p.getName());
}

function getClassOutputs(cls: ReturnType<SourceFile["getClasses"]>[number]): string[] {
  return cls.getProperties()
    .filter((p) => p.getDecorator("Output") !== undefined)
    .map((p) => p.getName());
}
